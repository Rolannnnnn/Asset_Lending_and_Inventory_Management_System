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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SPREADSHEET_UPLOAD_DIR = os.path.join(BASE_DIR, "stock_imports")
MAX_MB_SPREADSHEET = 10
ALLOWED_MIME_SPREADSHEET = {
    "text/csv": ".csv",
    "text/plain": ".csv",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
}

ITEM_STATUS = ["AVAILABLE", "BORROWED", "FOR_REPAIR", "DECOMMISSIONED"]

REQUIRED_COLUMN_STOCK = {"serial_number", "status", "condition"}
UNIQUE_COLUMN_STOCK = {"serial_number"}

# For Internal-Use Only. Do not expose to a route.
def check_and_save(logged: int, file_byte: bytes, item_id: int):
    conn = None
    try:    
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN", "SAS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("SELECT * FROM items WHERE id = %s", (item_id,))
                items = cur.fetchone()
                if not items:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="Selected item not found in the database.",
                    ))

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
            if not REQUIRED_COLUMN_STOCK.issubset(df.columns):
                missing = REQUIRED_COLUMN_STOCK - set(df.columns)
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
                for field in REQUIRED_COLUMN_STOCK:
                    if pd.isna(row[field]) or str(row[field]).strip() == "":
                        raise AppError(ErrorLog(
                            subject="Invalid Data", 
                            message=f"Row {row_num}: '{field}' is required."
                        ))

                # B. Normalize Serial Number
                raw_sn = str(row["serial_number"]).strip()
                norm_sn = raw_sn

                # C. Normalize Status
                status_raw = str(row["status"]).strip()
                status_norm = status_raw.upper()
                if status_norm not in ITEM_STATUS:
                    raise AppError(ErrorLog(
                        subject="Invalid Status", 
                        message=f"Row {row_num}: Status is invalid. Limit it to {ITEM_STATUS}"
                    ))
                   
                # D. Normalize Condition
                raw_condition = str(row["condition"]).strip()
                norm_condition = raw_condition

                # Update the Row with Normalized Data
                df.at[index, "serial_number"] = norm_sn
                df.at[index, "status"] = status_norm
                df.at[index, "condition"] = norm_condition

            df["item_id"] = item_id

            # Check For Duplicate Data
            for col in UNIQUE_COLUMN_STOCK:
                raw_series = df[col]
                stripped = raw_series.astype(str).str.strip()
                norm = stripped.str.lower()
                mask = raw_series.notna() & (stripped != "")
                duplicates = norm[mask].duplicated(keep=False)
                if duplicates.any():
                    first_dup_norm = norm[mask][duplicates].iloc[0]
                    rows = [i + 2 for i in norm[mask][duplicates].index.tolist()]
                    variants = sorted(set(stripped[norm == first_dup_norm].tolist()))
                    shown = ", ".join(variants[:5])
                    if len(variants) > 5:
                        shown = f"{shown} ..."
                    raise AppError(ErrorLog(
                        subject="Duplicate Entry",
                        message=(
                            f"The {col.replace('_', ' ')} value is duplicated (case-insensitive) in the file on rows: "
                            f"{', '.join(map(str, rows))}. Variants found: {shown}"
                        )
                    ))
                
            final_cols = ["serial_number", "item_id", "status", "condition"]
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
        db_relative_path = os.path.join("stock_imports", file_name)
        return (Import(
            uuid=uuid_var,
            file_name=file_name,
            file_path=db_relative_path,
            file_size=file_size,
            mime_type=mime,
            date=now
        ), final_cols), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "check_and_save"
        if not a.log.module:
            a.log.module = "item_import"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="check_and_save", module="item_import"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="check_and_save", module="item_import"
        )
    finally: 
        if conn:
            conn.close()
    
# This function assumes all paths are valid spreadsheet files with correct data
def import_stock(import_file: Import, cols: list[str]):
    successful = False
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        import_file.file_path = os.path.join(BASE_DIR, import_file.file_path)
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
                    CREATE TEMP TABLE staging_stock (
                        serial_number TEXT,
                        item_id INT,
                        status TEXT,
                        condition TEXT
                    ) ON COMMIT DROP;
                """)

                df = df[cols]
                df = df.where(pd.notna(df), None)
                rows = [tuple(x) for x in df.to_numpy()]

                insert_query = """
                    INSERT INTO staging_stock (serial_number, item_id, status, condition)
                    VALUES %s
                """
                execute_values(cur, insert_query, rows)

                # Do the Check using the Original and Temporary Table
                cur.execute("""
                    SELECT stage.serial_number, s.serial_number as db_owner
                    FROM staging_stock stage
                    JOIN stocks s ON (LOWER(stage.serial_number) = LOWER(s.serial_number))
                """)
                conflicts = cur.fetchall()
                
                if conflicts:
                    details = "\n".join([f"Serial '{c[0]}' conflicts with existing database record '{c[1]}'" for c in conflicts])
                    raise AppError(ErrorLog(
                        subject="Data Integrity Conflict",
                        message=f"The spreadsheet contains serial numbers already in the database:\n{details}"
                    ))
                
                insert_sql = "INSERT INTO stocks (serial_number, item_id, status, condition) VALUES %s"
                execute_values(cur, insert_sql, rows)
                
                ret_in = len(rows)
                ret_up = 0
                db_relative_path = os.path.join("student_imports", import_file.file_name)
                
                cur.execute("""
                    INSERT INTO imports 
                    (uuid, target_table, file_name, file_path, file_size, mime_type, date, inserts, updates)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)         
                """, (import_file.uuid, "STOCKS", import_file.file_name, db_relative_path, import_file.file_size,
                      import_file.mime_type, import_file.date, ret_in, ret_up))

                successful = True
                return FullImport(
                    imported=import_file,
                    inserted=ret_in,
                    updated=ret_up
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "import_stock"
        if not a.log.module:
            a.log.module = "item_import"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="import_stock", module="item_import"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="import_stock", module="item_import"
        )
    finally:
        if conn:
            conn.close()
        if not successful and os.path.exists(import_file.file_path):
            os.remove(import_file.file_path)