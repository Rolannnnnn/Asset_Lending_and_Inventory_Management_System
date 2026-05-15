import psycopg2
from psycopg2.extras import RealDictCursor

import app.general_checker as check
from app.dependency import get_db_config
from app.auth_helper import auth_account

from app.dataclass import AppError, ErrorLog
from app.dataclass import Student, FullStudent

def edit_details(logged: int, student_number: str, year: int, section: str, email: str, contact_number: str = None):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[student_number, section, email], ints=[year])
        nullable = check.check_nullable_parameters(strings=[contact_number])
        if strict == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))
        elif strict == 2 or nullable == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty or invalid."
            ))
        elif strict == 3 or nullable == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty."
            ))

        conn = psycopg2.connect(get_db_config())
        # Check EN, Email and Contact Number
        student_number, conf = check.strip_sn(student_number)
        if not conf:
            raise AppError(ErrorLog(
                subject="Wrong Format", message="Student number must contain exactly 8 numbers, and may or may not contain a letter."
            ))
        
        details, confs = check.check_details(email=email, contact_number=contact_number)

        if confs[0] == 1:
            raise AppError(ErrorLog(
                subject="Wrong Format", message="Email is not in a valid format."
            ))
        elif confs[0] == 2:
            raise AppError(ErrorLog(
                subject="DNS Not Found", message="Your Email provider's DNS cannot be found. Please double check your email and try again."
            ))
        
        if confs[1] == 1:
            raise AppError(ErrorLog(
                subject="Wrong Format", message="Contact Number is not in a valid format."
            ))
        
        email = details[0]
        contact_number = details[1]

        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN", "SAS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                # Check Existing
                check_contact = contact_number if contact_number else None
                cur.execute("""
                    SELECT 
                        EXISTS(SELECT 1 FROM students WHERE email = %s AND student_number != %s) AS email_exists,
                        EXISTS(SELECT 1 FROM students WHERE contact_number = %s AND contact_number IS NOT NULL AND student_number != %s) AS contact_exists
                """, (email, student_number, check_contact, student_number))
                existings = cur.fetchone()
                if existings["email_exists"]:
                    raise AppError(ErrorLog(
                        subject="Email Exists", message="The provided email is already being used by another student."
                    ))
                elif check_contact and existings["contact_exists"]:
                    raise AppError(ErrorLog(
                        subject="Contact Number Exists", message="The provided contact number is already being used by another student."
                    ))

                cur.execute("UPDATE students SET email = %s, contact_number = %s, year = %s, section = %s WHERE student_number = %s RETURNING *", (email, contact_number, year, section, student_number))
                res = cur.fetchone()
                if not res:
                    raise AppError(ErrorLog(
                        subject="Student Not Found", message="The provided student number does not exist."
                    ))
                return Student(
                    student_number=student_number,
                    name=res["name"],
                    course_id=res["course_id"],
                    section=section,
                    year=year,
                    email=email,
                    contact_number=contact_number,
                    is_active=res["is_active"]
                ) 
    except AppError as a:
        a.log.func, a.log.module = "edit_details", "student"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_details", module="student"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_details", module="student"
        )
    finally:
        if conn:
            conn.close()

def edit_status(logged: int, student_number: str, to_active: bool):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[student_number], bools=[to_active])
        if strict == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty or invalid."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty."
            ))
        elif strict == 4:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some boolean fields are empty."
            ))

        conn = psycopg2.connect(get_db_config())
        # Check EN, Email and Contact Number
        student_number, conf = check.strip_sn(student_number)
        if not conf:
            raise AppError(ErrorLog(
                subject="Wrong Format", message="Student number must contain exactly 8 numbers, and may or may not contain a letter."
            ))

        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN", "SAS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                # Check Existing
                cur.execute("SELECT * FROM students WHERE student_number = %s", (student_number,))
                student = cur.fetchone()
                if not student:
                    raise AppError(ErrorLog(
                        subject="Student Not Found", message="The provided student number does not exist."
                    ))
                if student["is_active"] == to_active:
                    raise AppError(ErrorLog(
                        subject="Invalid Action", message="The selected student is already at desired state."
                    ))
                
                cur.execute("UPDATE students SET is_active = %s WHERE student_number = %s", (to_active, student_number))

                return Student(
                    student_number=student_number,
                    name=student["name"],
                    course_id=student["course_id"],
                    section=student["section"],
                    year=student["year"],
                    email=student["email"],
                    contact_number=student["contact_number"],
                    is_active=to_active
                ), None
    except AppError as a:
        a.log.func, a.log.module = "edit_status", "student"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_status", module="student"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_status", module="student"
        )
    finally:
        if conn:
            conn.close()

def get_all_full(logged: int):
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
                
                cur.execute("""
                    SELECT s.*, c.name AS cname, c.code AS ccode
                    FROM students s
                    LEFT JOIN courses c ON s.course_id = c.id       
                """)
                students = cur.fetchall()
                if not students or students == []:
                    raise AppError(ErrorLog(
                        subject="No Students", 
                        message="There are no students in the database.",
                    ))
                
                returning = []
                for student in students:
                    returning.append(
                        FullStudent(
                            student_number=student["student_number"],
                            name=student["name"],
                            course_id=student["course_id"],
                            course_name=student["cname"],
                            course_code=student["ccode"],
                            section=student["section"],
                            year=student["year"],
                            email=student["email"],
                            contact_number=student["contact_number"],
                            is_active=student["is_active"]
                        )
                    )

                return returning, None
    except AppError as a:
        a.log.func, a.log.module = "edit_status", "student"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_status", module="student"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_status", module="student"
        )
    finally:
        if conn:
            conn.close()

def get_one(logged: int, student_number: str):
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
                
                cur.execute("SELECT * FROM students WHERE student_number = %s", (student_number,))
                student = cur.fetchone()
                if not student:
                    raise AppError(ErrorLog(
                        subject="Student Not Found", 
                        message="The selected student not found in the database.",
                    ))
                
                return Student(
                    student_number=student["student_number"],
                    name=student["name"],
                    course_id=student["course_id"],
                    section=student["section"],
                    year=student["year"],
                    email=student["email"],
                    contact_number=student["contact_number"],
                    is_active=student["is_active"]
                ), None
    except AppError as a:
        a.log.func, a.log.module = "edit_status", "student"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_status", module="student"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_status", module="student"
        )
    finally:
        if conn:
            conn.close()