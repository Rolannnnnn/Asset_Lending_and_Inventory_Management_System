import psycopg2
from psycopg2.extras import RealDictCursor, execute_values, execute_batch
from datetime import datetime as dt

from app.auth_helper import auth_account
from app.dependency import get_db_config
import app.general_checker as check

from app.dataclass import AppError, ErrorLog
from app.dataclass import Transaction, Transaction_Event, Transaction_Stock, FullTransaction

ITEM_STATUS = ["AVAILABLE", "BORROWED", "FOR_REPAIR", "DECOMMISSIONED"]
TRANSACTION_STATUS = ["REQUEST_BORROW", "ACCEPT_BORROW", "REQUEST_ISSUANCE", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT", "RETURNED", "TRANSFERRED_TO_PMS"]
DECLINED_STATUS = ["DECLINE_BORROW", "DECLINE_ISSUANCE",]

RESPONSES = ["ACCEPT", "DECLINE"]
RESPONDING_STATUS = ["AVAILABLE", "FOR_REPAIR", "DECOMMISSIONED"]

def request_borrow(logged: int, student_number: str, item_id: int, quantity: int):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id, quantity], strings=[student_number])
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
        
        if quantity <= 0:
            raise AppError(ErrorLog(
                subject="Invalid Quantity", message="Quantity must be a positive integer."
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
                        WHERE serial_number IN (
                            SELECT serial_number 
                            FROM stocks 
                            WHERE item_id = %s AND status = 'AVAILABLE'
                            LIMIT %s
                            FOR UPDATE SKIP LOCKED
                        )
                        RETURNING serial_number;   
                    """, (item_id, quantity))
                stock = cur.fetchall()
                if len(stock) < quantity:
                    raise AppError(ErrorLog(
                        subject="No Stock Available", 
                        message="There are no available units for this item at the moment.",
                    ))

                # Add to Database
                cur.execute("""
                    INSERT INTO transactions 
                    (status, student_number, item_id)
                    VALUES (%s, %s, %s)
                    RETURNING id            
                """, ("REQUEST_BORROW", student_number, item_id))
                t_id = cur.fetchone()
                now = dt.now()
                cur.execute("""
                    INSERT INTO transaction_events 
                    (transaction_id, type, date, personnel_id)
                    VALUES (%s, %s, %s, %s)
                """, (t_id["id"], "REQUEST_BORROW", now, logged))
                
                values = [
                    (t_id["id"], s["serial_number"])
                    for s in stock
                ]
                execute_values (
                    cur,
                    """
                        INSERT INTO transaction_stocks 
                        (transaction_id, stock_serial_number)
                        VALUES %s
                    """,
                    values
                )

                return Transaction(
                    id=t_id["id"],
                    status="REQUEST_BORROW",
                    student_number=student_number
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

def respond_borrow(logged: int, transaction_id: int, status: str, comment: str = None, to_issuance: bool = None):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=[status])
        nullable = check.check_nullable_parameters(strings=[comment], bools=[to_issuance])
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
        elif strict == 4 or nullable == 4:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some boolean fields are empty or invalid."
            ))
        
        # Check Comment and Status
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
        if status == "ACCEPT" and to_issuance is None:
            raise AppError(ErrorLog(
                subject="Issuance Error", message="Specifying whether to submit an issuance request or not is required when accepting borrow requests."
            ))
        
        if comment == "":
            comment = None
        
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
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
                    (transaction_id, type, date, personnel_id, comment)
                    VALUES (%s, %s, %s, %s, %s)            
                """, (transaction_id, mode, now, logged, comment))
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
                        WHERE status = 'BORROWED' 
                        AND serial_number IN (
                            SELECT stock_serial_number 
                            FROM transaction_stocks
                            WHERE transaction_id = %s               
                        )            
                    """, ("AVAILABLE", transaction_id))
                else:
                    if to_issuance:
                        tran, _ = request_issuance(logged=logged, transaction_id=transaction_id, conn=conn, cur=cur)
                        return tran, None
                    
                return Transaction(
                    id = res["id"],
                    status = res["status"],
                    student_number=res["student_number"]
                ), None
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
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="respond_borrow", module="transaction"
        )
    finally:
        if conn:
            conn.close()

def request_issuance(logged: int, transaction_id: int, conn = None, cur = None):
    own_conn = False
    try:
        if conn is None or cur is None:
            own_conn = True
            conn = psycopg2.connect(get_db_config())
            cur = conn.cursor(cursor_factory=RealDictCursor)

        # Checkers if the Request is an Independent request
        if own_conn:
            if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "ADMIN"]):
                raise AppError(ErrorLog(
                    subject="Forbidden", 
                    message="You do not have authorization to make this action.",
                ))
            cur.execute("SELECT * FROM transactions WHERE id = %s", (transaction_id,))
            transaction = cur.fetchone()
            if not transaction:
                raise AppError(ErrorLog(
                    subject="Transaction Not Found", 
                    message="The selected transaction is not found in the database.",
                ))
            if not transaction["status"] == "ACCEPT_BORROW":
                raise AppError(ErrorLog(
                    subject="Invalid Status", 
                    message="The selected transaction's status is incompatible with the chosen update.",
                ))
        
        now = dt.now()
        
        # Insert to Database
        cur.execute("""
            INSERT INTO transaction_events
            (transaction_id, type, date, personnel_id)
            VALUES (%s, %s, %s, %s)            
        """, (transaction_id, "REQUEST_ISSUANCE", now, logged))
        cur.execute("""
            UPDATE transactions
            SET status = %s
            WHERE id = %s
            RETURNING *
        """, ("REQUEST_ISSUANCE", transaction_id))
        res = cur.fetchone()

        if own_conn:
            conn.commit()
        return Transaction(
            id = res["id"],
            status = res["status"],
            student_number = res["student_number"]
        ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "request_issuance"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        if own_conn:
            conn.rollback()
            return None, a.log
        raise
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        error = AppError(ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="request_issuance", module="transaction"
        ))
        if own_conn:
            conn.rollback()
            return None, error.log
        else:
            raise error from e
    except Exception as e:
        print("INTERNAL ERROR:", e)
        error = AppError(ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="request_issuance", module="transaction"
        ))
        if own_conn:
            conn.rollback()
            return None, error.log
        else:
            raise error from e
    finally:
        if own_conn:
            cur.close()
            conn.close()

def respond_issuance(logged: int, transaction_id: int, status: str, comment: str = None):
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
        
        # Check Comment and Status
        if comment:
            comment = comment.strip()
            
        if status not in RESPONSES:
            raise AppError(ErrorLog(
                subject="Invalid Response", message="Responses can only be ACCEPT or DECLINE."
            ))
        if status == "DECLINE" and (comment is None or comment == ""):
            raise AppError(ErrorLog(
                subject="Comment Required", message="Comment is required for declining issuance requests."
            ))
        
        if comment == "":
            comment = None

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=False, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
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
                if not transaction["status"] == "REQUEST_ISSUANCE":
                    raise AppError(ErrorLog(
                        subject="Invalid Status", 
                        message="The selected transaction's status is incompatible with the chosen update.",
                    ))
                
                # Insert Into Database
                if status == "ACCEPT":
                    mode = "ACCEPT_ISSUANCE"
                else:
                    mode = "DECLINE_ISSUANCE"
                now = dt.now()
                cur.execute("""
                    INSERT INTO transaction_events
                    (transaction_id, type, date, personnel_id, comment)
                    VALUES (%s, %s, %s, %s, %s)            
                """, (transaction_id, mode, now, logged, comment))
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
                        WHERE status = 'BORROWED' 
                        AND serial_number IN (
                            SELECT stock_serial_number 
                            FROM transaction_stocks
                            WHERE transaction_id = %s       
                        )            
                    """, ("AVAILABLE", transaction_id))
                    
                return Transaction(
                    id = res["id"],
                    status = res["status"],
                    student_number=res["student_number"]
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "respond_issuance"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="respond_issuance", module="transaction"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="respond_issuance", module="transaction"
        )
    finally:
        if conn:
            conn.close()

def transfer_to_student(logged: int, transaction_id: int, custom_condition_sn: list[str] = [], custom_conditions: list[str] = []):
    conn = None
    strs = []
    for s in custom_conditions:
        strs.append(s)
    for s in custom_condition_sn:
        strs.append(s)
    
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=strs)
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
        
        if not len(custom_condition_sn) == len(custom_conditions):
            raise AppError(ErrorLog(
                subject="Invalid Input", message="The number of serial number and number of conditions must be equal."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
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
                if not transaction["status"] == "ACCEPT_ISSUANCE":
                    raise AppError(ErrorLog(
                        subject="Invalid Status", 
                        message="The selected transaction's status is incompatible with the chosen update.",
                    ))
                
                # Collect SN and Condition Pairs
                cur.execute("""
                    SELECT s.serial_number, s.condition
                    FROM stocks s
                    JOIN transaction_stocks ts ON s.serial_number = ts.stock_serial_number
                    WHERE ts.transaction_id = %s           
                """, (transaction_id,))
                conditions = cur.fetchall()
                if not conditions or conditions == []:
                    raise AppError(ErrorLog(
                        subject="Empty Borrowing List", 
                        message="This transaction does not contain any borrowed item.",
                    ))
                db_sns = {r["serial_number"] for r in conditions}
                input_sns = set(custom_condition_sn)
                if not input_sns.issubset(db_sns):
                    invalid_sns = input_sns - db_sns
                    raise AppError(ErrorLog(
                        subject="Invalid Serial Number",
                        message=f"The following SNs are not part of this transaction: {', '.join(invalid_sns)}"
                    ))

                pairs = dict()
                cond = dict()
                for r in conditions:
                    pairs[r["serial_number"]] = r["condition"]
                for i in range(len(custom_condition_sn)):
                    if custom_condition_sn[i] in pairs:
                        pairs[custom_condition_sn[i]] = custom_conditions[i]
                        cond[custom_condition_sn[i]] = custom_conditions[i]

                # Insert to Database
                now = dt.now()
                cur.execute("""
                    INSERT INTO transaction_events
                    (transaction_id, type, date, personnel_id)
                    VALUES (%s, %s, %s, %s)            
                """, (transaction_id, "TRANSFERRED_TO_STUDENT", now, logged))
                cur.execute("""
                    UPDATE transactions
                    SET status = %s
                    WHERE id = %s
                    RETURNING *            
                """, ("TRANSFERRED_TO_STUDENT", transaction_id))
                res = cur.fetchone()

                # Update Conditions
                u_ts_values = [
                    (c, transaction_id, sn)
                    for sn, c in pairs.items()
                ]
                update_ts_sql = """
                    UPDATE transaction_stocks
                    SET condition_releasing = %s
                    WHERE transaction_id = %s
                    AND stock_serial_number = %s
                """
                execute_batch(
                    cur, update_ts_sql, u_ts_values
                )
                u_s_values = [
                    (c, sn)
                    for sn, c in cond.items()
                ]
                update_s_sql = """
                    UPDATE stocks
                    SET condition = %s
                    WHERE serial_number = %s
                """
                execute_batch(
                    cur, update_s_sql, u_s_values
                )

                return Transaction(
                    id = res["id"],
                    status = res["status"],
                    student_number=res["student_number"]
                ), None   
    except AppError as a:
        if not a.log.func:
            a.log.func = "transfer_to_student"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="transfer_to_student", module="transaction"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="transfer_to_student", module="transaction"
        )
    finally:
        if conn:
            conn.close()
    
def for_return(logged: int, transaction_id: int, custom_condition_sn: list[str] = [], custom_conditions: list[str] = []):
    conn = None
    strs = []
    strs = custom_conditions + custom_condition_sn
    
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=strs)
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
        
        if not len(custom_condition_sn) == len(custom_conditions):
            raise AppError(ErrorLog(
                subject="Invalid Input", message="The number of serial numbers, and condition must be equal."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
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
                if not transaction["status"] == "TRANSFERRED_TO_STUDENT":
                    raise AppError(ErrorLog(
                        subject="Invalid Status", 
                        message="The selected transaction's status is incompatible with the chosen update.",
                    ))
                
                # Collect SN and Condition Pairs, and Status
                cur.execute("""
                    SELECT s.serial_number, s.condition
                    FROM stocks s
                    JOIN transaction_stocks ts ON s.serial_number = ts.stock_serial_number
                    WHERE ts.transaction_id = %s           
                """, (transaction_id,))
                conditions = cur.fetchall()
                if not conditions or conditions == []:
                    raise AppError(ErrorLog(
                        subject="Empty Borrowing List", 
                        message="This transaction does not contain any borrowed item.",
                    ))
                db_sns = {r["serial_number"] for r in conditions}
                input_sns = set(custom_condition_sn)
                if not input_sns.issubset(db_sns):
                    invalid_sns = input_sns - db_sns
                    raise AppError(ErrorLog(
                        subject="Invalid Serial Number",
                        message=f"The following SNs are not part of this transaction: {', '.join(invalid_sns)}"
                    ))

                pairs = dict()
                cond = dict()
                for r in conditions:
                    pairs[r["serial_number"]] = r["condition"]
                for i in range(len(custom_condition_sn)):
                    if custom_condition_sn[i] in pairs:
                        pairs[custom_condition_sn[i]] = custom_conditions[i]
                        cond[custom_condition_sn[i]] = custom_conditions[i]

                # Insert to Database
                now = dt.now()
                cur.execute("""
                    INSERT INTO transaction_events
                    (transaction_id, type, date, personnel_id)
                    VALUES (%s, %s, %s, %s)            
                """, (transaction_id, "RETURNED", now, logged))
                cur.execute("""
                    UPDATE transactions
                    SET status = %s
                    WHERE id = %s
                    RETURNING *            
                """, ("RETURNED", transaction_id))
                res = cur.fetchone()

                # Update Conditions
                u_ts_values = [
                    (c, transaction_id, sn)
                    for sn, c in pairs.items()
                ]
                update_ts_sql = """
                    UPDATE transaction_stocks
                    SET condition_returning = %s
                    WHERE transaction_id = %s
                    AND stock_serial_number = %s
                """
                execute_batch(
                    cur, update_ts_sql, u_ts_values
                )
                u_s_values = [
                    (c, sn)
                    for sn, c in cond.items()
                ]
                update_s_sql = """
                    UPDATE stocks
                    SET condition = %s
                    WHERE serial_number = %s
                """
                execute_batch(
                    cur, update_s_sql, u_s_values
                )

                return Transaction(
                    id = res["id"],
                    status = res["status"],
                    student_number=res["student_number"]
                ), None   
    except AppError as a:
        if not a.log.func:
            a.log.func = "for_return"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="for_return", module="transaction"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="for_return", module="transaction"
        )
    finally:
        if conn:
            conn.close()

def transfer_to_pms(logged: int, transaction_id: int, custom_condition_sn: list[str], custom_condition_status: list[str]):
    conn = None
    strs = custom_condition_status + custom_condition_sn
    
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[transaction_id], strings=strs)
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
        
        if not len(custom_condition_sn) == len(custom_condition_status):
            raise AppError(ErrorLog(
                subject="Invalid Input", message="The number of serial numbers and status must be equal."
            ))
        if any(c not in RESPONDING_STATUS for c in custom_condition_status):
            raise AppError(ErrorLog(
                subject="Invalid Status", message=f"Status can only be: {RESPONDING_STATUS}."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=False, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
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
                if not transaction["status"] == "RETURNED":
                    raise AppError(ErrorLog(
                        subject="Invalid Status", 
                        message="The selected transaction's status is incompatible with the chosen update.",
                    ))
                
                cur.execute("SELECT stock_serial_number FROM transaction_stocks WHERE transaction_id = %s", (transaction_id,))
                db_ssns = {r["stock_serial_number"] for r in cur.fetchall()}
                input_ssns = set(custom_condition_sn)

                if input_ssns != db_ssns:
                    missing = db_ssns - input_ssns
                    extra = input_ssns - db_ssns
                    error_msg = "Serial numbers do not match transaction record."
                    if missing:
                        error_msg += f" Missing: {', '.join(missing)}."
                    if extra:
                        error_msg += f" Unexpected: {', '.join(extra)}."
                    raise AppError(ErrorLog(
                        subject="Validation Error", 
                        message=error_msg
                    ))

                # Collect SN and Status
                pairs = dict()
                for i in range(len(custom_condition_sn)):
                    pairs[custom_condition_sn[i]] = custom_condition_status[i]

                # Insert to Database
                now = dt.now()
                cur.execute("""
                    INSERT INTO transaction_events
                    (transaction_id, type, date, personnel_id)
                    VALUES (%s, %s, %s, %s)            
                """, (transaction_id, "TRANSFERRED_TO_PMS", now, logged))
                cur.execute("""
                    UPDATE transactions
                    SET status = %s
                    WHERE id = %s
                    RETURNING *            
                """, ("TRANSFERRED_TO_PMS", transaction_id))
                res = cur.fetchone()

                # Update Status
                update_sql = """
                    UPDATE stocks
                    SET status = %s
                    WHERE serial_number = %s
                """
                u_values = [
                    (s, sn)
                    for sn, s in pairs.items()
                ]
                execute_batch(cur, update_sql, u_values)

                return Transaction(
                    id = res["id"],
                    status = res["status"],
                    student_number=res["student_number"]
                ), None   
    except AppError as a:
        if not a.log.func:
            a.log.func = "transfer_to_pms"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="transfer_to_pms", module="transaction"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="transfer_to_pms", module="transaction"
        )
    finally:
        if conn:
            conn.close()

def get_all_via_account_id(logged: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT role FROM accounts WHERE id = %s", (logged,))
                account = cur.fetchone()
                if not account:
                    raise AppError(ErrorLog(
                        subject="Account Not Found", 
                        message="The account logged in is not found in the database."
                    ))
                
                if account["role"] == "ADMIN":
                    query = """
                        SELECT 
                            t.*,
                            COALESCE(
                                (SELECT json_agg(to_jsonb(ts.*)) 
                                FROM transaction_stocks ts 
                                WHERE ts.transaction_id = t.id), 
                                '[]'
                            ) AS stocks,
                            COALESCE(
                                (SELECT json_agg(to_jsonb(te.*)) 
                                FROM transaction_events te 
                                WHERE te.transaction_id = t.id), 
                                '[]'
                            ) AS events
                        FROM transactions t;
                        """
                    cur.execute(query)
                    transactions = cur.fetchall()

                    if transactions is None or transactions == []:
                        raise AppError(ErrorLog(
                            subject="No Transactions", 
                            message="There are no transactions found in the database."
                        ))
                    
                    returning = []
                    for transaction in transactions:
                        t = Transaction(
                            id=transaction["id"],
                            status=transaction["status"],
                            student_number=transaction["student_number"]
                        )
                        # Map Stocks using list comprehension
                        s = [
                            Transaction_Stock(
                                serial_number=stock["stock_serial_number"],
                                condition_releasing=stock["condition_releasing"],
                                condition_returning=stock["condition_returning"]
                            ) for stock in transaction["stocks"]
                        ]

                        # Map Events using list comprehension
                        e = [
                            Transaction_Event(
                                type=event["type"],
                                date=event["date"],
                                personnel_id=event["personnel_id"],
                                comment=event["comment"]
                            ) for event in transaction["events"] 
                        ]
                        returning.append(
                            FullTransaction(
                                transaction=t,
                                events=e,
                                stocks=s
                            )
                        )
                    return returning, None
    except AppError as a:
        if not a.log.func:
            a.log.func = "get_all_via_account_id"
        if not a.log.module:
            a.log.module = "transaction"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="get_all_via_account_id", module="transaction"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_all_via_account_id", module="transaction"
        )
    finally:
        if conn:
            conn.close()