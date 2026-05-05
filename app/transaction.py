import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime as dt

from app.auth_helper import auth_account
from app.dependency import get_db_config
import app.general_checker as check

from app.dataclass import AppError, ErrorLog
from app.dataclass import Transaction

ITEM_STATUS = ["AVAILABLE", "BORROWED", "FOR_REPAIR", "DECOMMISSIONED"]
TRANSACTION_STATUS = ["REQUEST_BORROW", "ACCEPT_BORROW", "REQUEST_ISSUANCE", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT", "REQUEST_RETURN", "ACCEPT_RETURN", "RETURNED"]
DECLINED_STATUS = ["DECLINE_BORROW", "DECLINE_ISSUANCE", "DECLINE_RETURN"]

RESPONSES = ["ACCEPT", "DECLINE"]

def request_borrow(logged: int, student_number: str, item_id: int, item_condition: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id], strings=[student_number, item_condition])
        if strict == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))
        elif strict == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty or invalid."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))
                
                # Check Student
                cur.execute("SELECT * FROM students WHERE student_number = %s", (student_number,))
                student = cur.fetchone()
                if not student:
                    raise AppError(ErrorLog(
                        subject="Student Not Found", 
                        message="The student number does not exist in the database.",
                    ))
                if not student["is_active"]:
                    raise AppError(ErrorLog(
                        subject="Student Not Available", 
                        message="The student is inactive, and cannot be a recipient.",
                    ))
                
                # Check Item and Stock
                cur.execute("SELECT * FROM items WHERE id = %s", (item_id,))
                item = cur.fetchone()
                if not item:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item does not exist in the database.",
                    ))
                cur.execute("""
                        UPDATE stocks 
                        SET status = 'BORROWED'
                        WHERE serial_number = (
                            SELECT serial_number 
                            FROM stocks 
                            WHERE item_id = %s AND status = 'AVAILABLE'
                            LIMIT 1
                            FOR UPDATE SKIP LOCKED
                        )
                        RETURNING serial_number;   
                    """, (item_id,))
                stock = cur.fetchone()
                if not stock:
                    raise AppError(ErrorLog(
                        subject="No Stock Available", 
                        message="There are no available units for this item at the moment.",
                    ))

                # Add to Database
                cur.execute("""
                    INSERT INTO transactions 
                    (status, stock_serial_number, student_number, item_condition_releasing)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id            
                """, ("REQUEST_BORROW", stock["serial_number"], student_number, item_condition))
                t_id = cur.fetchone()
                now = dt.now()
                cur.execute("""
                    INSERT INTO transaction_events 
                    (transaction_id, type, date, personnel_id)
                    VALUES (%s, %s, %s, %s)
                """, (t_id["id"], "REQUEST_BORROW", now, logged))

                return Transaction(
                    id=t_id["id"],
                    status="REQUEST_BORROW",
                    stock_serial_number=stock["serial_number"],
                    student_number=student_number,
                    student_name=student["name"],
                    item_condition_releasing=item_condition
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "request_borrow"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="request_borrow", module="transaction"
        )
    finally:
        if conn:
            conn.close()

def respond_borrow(logged: int, transaction_id: int, status: str, comment: str = None):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=[status])
        nullable = check.check_nullable_parameters(strings=[comment])
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
        
        # Check Comment and Response
        if comment:
            comment = comment.strip()
            
        if status not in RESPONSES:
            raise AppError(ErrorLog(
                subject="Invalid Response", message="Responses can only be ACCEPT or DECLINE."
            ))
        if status == "DECLINE" and (comment is None or comment == ""):
            raise AppError(ErrorLog(
                subject="Comment Required", message="Comment is required for declining borrow requests."
            ))
        
        if comment == "":
            comment = None
        
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor() as cur:
                if not auth_account(logged=logged, or_mode=False, conn=conn, cur=cur, role_needed=["SAS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))
                
                # Check Transaction
                cur.execute("SELECT * FROM transactions WHERE id = %s", (transaction_id,))
                transaction = cur.fetchone()
                if not transaction:
                    raise AppError(ErrorLog(
                        subject="Transaction Not Found", 
                        message="The selected transaction does not exist in the database.",
                    ))
                if not transaction["status"] == "REQUEST_BORROW":
                    raise AppError(ErrorLog(
                        subject="Invalid Status", 
                        message="The selected transaction's status is incompatible with the chosen update.",
                    ))
                
                # Insert Into Database
                if status == "ACCEPT":
                    mode = "ACCEPT_BORROW"
                else:
                    mode = "DECLINE_BORROW"
                now = dt.now()

                cur.execute("""
                    INSERT INTO transaction_events
                    (transaction_id, type, date, personnel_id)
                    VALUES (%s, %s, %s, %s)            
                """, (transaction_id, mode, now, comment))
                cur.execute("""
                    UPDATE transactions
                    SET status = %s
                    WHERE id = %s
                    RETURNING *            
                """, (mode, transaction_id))
                res = cur.fetchone()

                if status == "DECLINE":
                    cur.execute("""
                        UPDATE stocks
                        SET status = %s
                        WHERE serial_number = %s         
                    """, ())

    except AppError as a:
        if not a.log.func:
            a.log.func = "respond_borrow"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="respond_borrow", module="transaction"
        )
    finally:
        if conn:
            conn.close()