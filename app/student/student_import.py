import psycopg2
from psycopg2.extras import RealDictCursor, execute_values, execute_batch
from datetime import datetime as dt
import os, magic, io, uuid
import pandas as pd

from app.auth_helper import auth_account
from app.dependency import get_db_config
import app.general_checker as check

from app.dataclass import AppError, ErrorLog
from app.dataclass import Import, FullImport

SPREADSHEET_UPLOAD_DIR = os.path.abspath("student_imports")
MAX_MB_SPREADSHEET = 10
ALLOWED_MIME_SPREADSHEET = {
    "text/csv": ".csv",
    "text/plain": ".csv",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
}

REQUIRED_COLUMN_STUDENT = {"student_number", "course", "year", "section", "email", "name", "contact_number"}
MANDATORY_COLUMN_STUDENT = {"student_number", "course", "year", "section", "email", "name"}
UNIQUE_COLUMN_STUDENT = {"student_number", "email", "contact_number"}

# For Internal-Use Only. Do not expose to a route.
def check_and_save(logged: int, file_byte: bytes):
    conn = None
    try:    
        course_lookup = {}

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN", "SAS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("SELECT id, name, code FROM courses")
                co = cur.fetchall()
                if not co or co == []:
                    raise AppError(ErrorLog(
                        subject="No Courses", 
                        message="There are no defined courses in the database.",
                    ))
                for c in co:
                    course_lookup[str(c["name"]).strip().lower()] = c["id"]
                    course_lookup[str(c["code"]).strip().lower()] = c["id"]

        # Check File Basics
        if file_byte is None:
            raise AppError(ErrorLog(
                subject="No File Attached", 
                message="There is no attached file. Please make sure the file is properly attached before proceeding."
            ))
        if not isinstance(file_byte, bytes):
            raise AppError(ErrorLog(
                subject="Invalid File", 
                message="File is not formatted correctly."
            ))
        
        # Check File Contents
        # File Type
        mime = magic.from_buffer(file_byte, mime=True)
        if mime not in ALLOWED_MIME_SPREADSHEET:
            raise AppError(ErrorLog(
                subject="Invalid File", 
                message="Ensure that the uploaded file is a valid Excel or CSV file."
            ))

        # File Size
        MAX_SIZE = MAX_MB_SPREADSHEET * 1024 * 1024
        if len(file_byte) > MAX_SIZE:
            raise AppError(ErrorLog(
                subject="File Too Large",
                message=f"A file exceeds the {MAX_MB_SPREADSHEET}MB limit."
            ))

        try:
            # Required Columns
            stream = io.BytesIO(file_byte)
            if mime in ["text/csv", "text/plain"]:
                df = pd.read_csv(stream, dtype=str)
            else:
                df = pd.read_excel(stream, dtype=str)

            df.columns = df.columns.str.strip().str.lower()
            if not REQUIRED_COLUMN_STUDENT.issubset(df.columns):
                missing = REQUIRED_COLUMN_STUDENT - set(df.columns)
                raise AppError(ErrorLog(
                    subject="Missing Columns", 
                    message=f"Missing: {', '.join(missing)}"
                ))

            if df.empty:
                raise AppError(ErrorLog(subject="Empty File", message="The spreadsheet contains no data."))
            
            # Deep Checking of Rows
            for index, row in df.iterrows():
                row_num = index + 2 
                
                # A. Check mandatory fields for empty values
                for field in MANDATORY_COLUMN_STUDENT:
                    if pd.isna(row[field]) or str(row[field]).strip() == "":
                        raise AppError(ErrorLog(
                            subject="Invalid Data", 
                            message=f"Row {row_num}: '{field}' is required."
                        ))

                # B. Normalize Student Number
                raw_sn = str(row["student_number"])
                norm_sn, sn_valid = check.strip_sn(raw_sn)
                if not sn_valid:
                    raise AppError(ErrorLog(
                        subject="Invalid Employee Number", 
                        message=f"Row {row_num}: '{raw_sn}' is not a valid student number."
                    ))

                # C. Normalize Email & Contact Details
                email_raw = str(row["email"]).strip()
                contact_raw = str(row["contact_number"]) if pd.notna(row["contact_number"]) else ""
                norms, confs = check.check_details(email_raw, contact_raw)
                norm_email, norm_contact = norms
                email_conf, contact_conf = confs
                if email_conf == 1:
                    raise AppError(ErrorLog(
                        subject="Invalid Email", 
                        message=f"Row {row_num}: Email syntax is invalid."
                    ))
                if email_conf == 2:
                    raise AppError(ErrorLog(
                        subject="Invalid Email", 
                        message=f"Row {row_num}: Email domain is unreachable."
                    ))
                if contact_conf == 1 and contact_raw is not None:
                    raise AppError(ErrorLog(
                        subject="Invalid Contact", 
                        message=f"Row {row_num}: Invalid PH contact number."
                    ))
                
                # D. Normalize Name
                name_raw = str(row["name"]).strip()
                norm_name = name_raw.title()

                # E. Fetch Course ID
                course_val = str(row["course"]).strip().lower()
                print(course_lookup)
                norm_course = course_lookup.get(course_val)
                if norm_course is None:
                    raise AppError(ErrorLog(
                        subject="Course Not Found", 
                        message=f"Row {row_num}: Course '{course_val}' not found."
                    ))

                # F. Minor Checking of Types
                year_raw = row["year"]
                section_raw = row["section"]
                try:
                    norm_year = int(float(year_raw)) 
                except (ValueError, TypeError):
                    raise AppError(ErrorLog(
                        subject="Invalid Year", 
                        message=f"Row {row_num}: 'year' must be a whole number (e.g., 1, 2, 3)."
                    ))
                try:
                    # float conversion handles '2024.0', int() handles the decimal
                    norm_section = str(section_raw).strip()
                except (ValueError, TypeError):
                    raise AppError(ErrorLog(
                        subject="Invalid Year", 
                        message=f"Row {row_num}: 'section' must be a string"
                    ))

                # Update the Row with Normalized Data
                df.at[index, "student_number"] = norm_sn
                df.at[index, "email"] = norm_email
                df.at[index, "contact_number"] = norm_contact
                df.at[index, "name"] = norm_name
                df.at[index, "course"] = norm_course
                df.at[index, "section"] = norm_section
                df.at[index, "year"] = norm_year

            # Check For Duplicate Data
            for col in UNIQUE_COLUMN_STUDENT:
                mask = df[col].notna() & (df[col].astype(str).str.strip() != "")
                duplicates = df[mask].duplicated(subset=[col], keep=False)
                if duplicates.any():
                    first_dup_val = df.loc[mask & duplicates, col].iloc[0]
                    rows = [i + 2 for i in df.index[mask & duplicates].tolist()]
                    raise AppError(ErrorLog(
                        subject="Duplicate Entry",
                        message=f"The {col.replace('_', ' ')} '{first_dup_val}' is duplicated in the file on rows: {', '.join(map(str, rows))}."
                    ))

            df = df.rename(columns={"course": "course_id"})
            final_cols = ["student_number", "course_id", "year", "section", "email", "contact_number", "name"]
            df = df[final_cols]
            output_stream = io.BytesIO()
            if mime in ["text/csv", "text/plain"]:
                df.to_csv(output_stream, index=False)
            else:
                df.to_excel(output_stream, index=False, engine='openpyxl')
            
            final_content = output_stream.getvalue()
        except AppError:
            raise
        except Exception as e:
            print("ERROR:", e)
            raise AppError(ErrorLog(
                subject="Parsing Error", 
                message="Unable to read the file headers. Please ensure it is a valid spreadsheet."
            ))

        # Save the File Reference
        now = dt.now()
        formatted_date = now.strftime("%m-%d-%y;%H-%M-%S")
        ext = ALLOWED_MIME_SPREADSHEET.get(mime, ".csv")
        uuid_var = str(uuid.uuid4())
        file_name = f"{formatted_date}{ext}"
        attachment = {
            "content": final_content,
            "filename": file_name
        }

        # Save a Copy of the File based on Reference
        os.makedirs(SPREADSHEET_UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(SPREADSHEET_UPLOAD_DIR, attachment["filename"])
        file_size = len(attachment["content"])
        with open(file_path, "wb") as w:
            w.write(attachment["content"]) 
        return (Import(
            uuid=uuid_var,
            file_name=file_name,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime,
            date=now
        ), final_cols), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "check_and_save"
        if not a.log.module:
            a.log.module = "student_import"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="check_and_save", module="student_import"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="check_and_save", module="student_import"
        )
    finally: 
        if conn:
            conn.close()
    
# This function assumes all paths are valid spreadsheet files with correct data
def import_student(import_file: Import, update: bool, cols: list[str]):
    successful = False
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor() as cur:
                # Check for Duplicate Email or Contact Number
                mime = magic.from_file(import_file.file_path, mime=True)
                if mime in ["text/csv", "text/plain"]:
                    df = pd.read_csv(import_file.file_path, dtype=str)
                else:
                    df = pd.read_excel(import_file.file_path, dtype=str)

                # A. Create Temporary Table and Store Spreadsheet Data in it
                cur.execute("""
                    CREATE TEMP TABLE staging_student (
                        student_number TEXT,
                        course_id INT,
                        year INT,
                        section TEXT,
                        email TEXT,
                        contact_number TEXT,
                        name TEXT
                    ) ON COMMIT DROP;
                """)

                df = df[cols]
                df = df.where(pd.notna(df), None)
                rows = [tuple(x) for x in df.to_numpy()]

                insert_query = """
                    INSERT INTO staging_student (student_number, course_id, year, section, email, contact_number, name)
                    VALUES %s
                """
                execute_values(cur, insert_query, rows)

                # B. Do the Check using the Original and Temporary Table
                cur.execute("""
                    SELECT ss.student_number, ss.email, s.student_number as db_owner
                    FROM staging_student ss
                    JOIN students s ON (ss.email = s.email OR (ss.contact_number = s.contact_number AND ss.contact_number IS NOT NULL))
                    WHERE ss.student_number != s.student_number
                """)
                conflicts = cur.fetchall()
                
                if conflicts:
                    details = "\n".join([f"ID {c[0]} conflicts with existing ID {c[2]}" for c in conflicts])
                    raise AppError(ErrorLog(
                        subject="Data Integrity Conflict",
                        message=f"The spreadsheet contains contact info already owned by others:\n{details}"
                    ))
                
                # Check for Duplicate Student number
                spreadsheet_sns = df['student_number'].tolist()
                if spreadsheet_sns:
                    cur.execute("SELECT student_number FROM students WHERE student_number = ANY(%s)", (spreadsheet_sns,))
                    existing_sns = {row[0] for row in cur.fetchall()}
                else:
                    existing_sns = set()
                new_students = []
                update_students = []
                for row in df.itertuples(index=False):
                    if row.student_number in existing_sns:
                        update_cols = [
                            "course_id",
                            "year",
                            "section",
                            "email",
                            "contact_number",
                            "name",
                            "student_number"
                        ]
                        update_students.append(tuple(getattr(row, col) for col in update_cols))
                    else:
                        new_students.append(tuple(getattr(row, col) for col in cols))
                
                # Insert New
                if new_students:
                    insert_sql = "INSERT INTO students (student_number, course_id, year, section, email, contact_number, name) VALUES %s"
                    execute_values(cur, insert_sql, new_students)

                # Update Existing (only if requested)
                if update and update_students:
                    update_sql = """
                        UPDATE students SET course_id = %s, year = %s, section = %s, email = %s, contact_number = %s, name = %s 
                        WHERE student_number = %s
                    """
                    execute_batch(cur, update_sql, update_students)
                
                # Insert File Reference to Database
                ret_in = len(new_students)
                ret_up = len(update_students) if update else 0
                cur.execute("""
                    INSERT INTO imports 
                    (uuid, target_table, file_name, file_path, file_size, mime_type, date, inserts, updates)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)         
                """, (import_file.uuid, "STUDENT", import_file.file_name, import_file.file_path, import_file.file_size,
                      import_file.mime_type, import_file.date, ret_in, ret_up))

                successful = True
                return FullImport(
                    imported=import_file,
                    inserted=ret_in,
                    updated=ret_up
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "import_student"
        if not a.log.module:
            a.log.module = "student_import"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="import_student", module="student_import"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="import_student", module="student_import"
        )
    finally:
        if conn:
            conn.close()
        if not successful and os.path.exists(import_file.file_path):
            os.remove(import_file.file_path)