import psycopg2
from psycopg2.extras import RealDictCursor

from app.dependency import get_db_config
from app.auth_helper import auth_account
import app.general_checker as check

from app.dataclass import AppError, ErrorLog
from app.dataclass import Course

def add_course(logged: int, name: str, code: str, college: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[name, code, college])
        if strict in [2, 3]:
            raise AppError(ErrorLog(
                subject="Invalid Input", 
                message="Some string fields are empty or invalid." if strict == 2 else "Some string fields are empty."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                # Normalize Data
                name = normalize_course(name)
                code = code.strip().upper()
                college = normalize_course(college)
                
                # Case-Insensitive Duplicate Check
                cur.execute("""
                    SELECT EXISTS(
                        SELECT 1 FROM courses 
                        WHERE LOWER(name) = LOWER(%s) OR LOWER(code) = LOWER(%s)
                    ) AS existing
                """, (name, code))
                
                if cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Course Already Exists", 
                        message="A course with this name or/and code already exists.",
                    ))

                cur.execute("INSERT INTO courses (name, code, college) VALUES (%s, %s, %s) RETURNING id", (name, code, college))
                course = cur.fetchone()
                
                return Course(
                    id=course["id"],
                    name=name,
                    code=code,
                    college=college
                ), None
    except AppError as a:
        if not a.log.func: a.log.func = "add_course"
        if not a.log.module: a.log.module = "course"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="add_course", module="course"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="add_course", module="course"
        )
    finally:
        if conn:
            conn.close()


def edit_course(logged: int, course_id: int, name: str, code: str, college: str):
    conn = None
    try:
        strict = check.check_strict_parameters(strings=[name, code, college])
        if strict in [2, 3]:
            raise AppError(ErrorLog(
                subject="Invalid Input", 
                message="Some string fields are empty or invalid." if strict == 2 else "Some string fields are empty."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("SELECT EXISTS(SELECT 1 FROM courses WHERE id = %s) AS existing", (course_id,))
                if not cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Course Not Found", 
                        message="The selected course is not found in the database.",
                    ))

                # Normalize Data
                name = normalize_course(name)
                code = code.strip().upper()
                college = normalize_course(college)
                
                # Case-Insensitive Check for OTHER courses matching these unique fields
                cur.execute("""
                    SELECT EXISTS(
                        SELECT 1 FROM courses 
                        WHERE (LOWER(name) = LOWER(%s) OR LOWER(code) = LOWER(%s)) 
                        AND id <> %s
                    ) AS existing
                """, (name, code, course_id))
                
                if cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Details Already Exists", 
                        message="Another course with this name or/and code already exists.",
                    ))

                cur.execute("""
                    UPDATE courses SET
                    name = %s,
                    code = %s,
                    college = %s
                    WHERE id = %s         
                """, (name, code, college, course_id))
                
                return Course(
                    id=course_id,
                    name=name,
                    code=code,
                    college=college
                ), None
    except AppError as a:
        if not a.log.func: a.log.func = "edit_course"
        if not a.log.module: a.log.module = "course"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_course", module="course"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_course", module="course"
        )
    finally:
        if conn:
            conn.close()


def get_all(logged: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("SELECT id, name, code, college FROM courses")
                courses = cur.fetchall()

                if not courses:
                    raise AppError(ErrorLog(
                        subject="No Courses", 
                        message="There is no course found in the database.",
                    ))

                # List comprehension is much faster and cleaner than manual loops
                return [Course(id=c["id"], name=c["name"], code=c["code"], college=c["college"]) for c in courses], None
    except AppError as a:
        if not a.log.func: a.log.func = "get_all"
        if not a.log.module: a.log.module = "course"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="get_all", module="course"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_all", module="course"
        )
    finally:
        if conn:
            conn.close()


def normalize_course(course: str):
    exceptions = {"of", "in", "and", "the", "a", "an", "with", "for", "to"}
    
    words = course.strip().lower().split()
    if not words:
        return ""
        
    result = []
    for index, word in enumerate(words):
        if index == 0 or word not in exceptions:
            result.append(word.capitalize())
        else:
            result.append(word)
            
    return " ".join(result)