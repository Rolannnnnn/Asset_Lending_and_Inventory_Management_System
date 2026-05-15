import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime as dt

from app.auth_helper import auth_account
from app.dependency import get_db_config
import app.general_checker as check

from app.dataclass import AppError, ErrorLog

FORM_ALLOWED = ["SAMPLE"]

SAMPLE_IMAGE = "sample.png"
SAMPLE_COORDS = "sample.json"

# Based on the form, load the correct image, coordinates, and class
# Class member names and json names must match
def generate_form(logged: int, transaction_id: int, form: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=[form])
        if strict == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))
        elif strict == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string parameters are of invalid type."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string parameters are missing."
            ))
        
        if form not in FORM_ALLOWED:
            raise AppError(ErrorLog(
                subject="Invalid Form", message="The selected form is currently not supported."
            ))
        
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN", "PMS", "SAS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))
                cur.execute("""
                    SELECT 
                        t.*,
                        s.name AS student_name
                        COALESCE(
                            (
                                SELECT jsonb_agg(
                                    to_jsonb(te) || jsonb_build_object('personnel_name', a.name)
                                )
                                FROM transaction_events te
                                LEFT JOIN accounts a ON te.personnel_id = a.id
                                WHERE te.transaction_id = t.id
                            ), 
                            '[]'::jsonb
                        ) as events,
                        COALESCE(
                            (SELECT json_agg(ts) FROM transaction_stocks ts WHERE ts.transaction_id = t.id), 
                            '[]'::json
                        ) as stocks
                    LEFT JOIN students s ON s.student_number = t.student_number
                    FROM transactions t
                    WHERE t.id = %s;            
                """, (transaction_id,))
                transaction = cur.fetchone()

                if not transaction:
                    raise AppError(ErrorLog(
                        subject="Transaction Not Found", 
                        message="The transaction selected is not found in the database.",
                    ))
    except AppError as a:
        if not a.log.func:
            a.log.func = "generate_form"
        if not a.log.module:
            a.log.module = "generate"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="generate_form", module="generate"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="generate_form", module="generate"
        )
    finally:
        if conn:
            conn.close()