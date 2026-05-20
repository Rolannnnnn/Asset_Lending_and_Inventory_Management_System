# All functions here rely on other functions for validation and connection. It assumes all necesarry ids exist. Exception for viewing.
# Accept borrow should only fire if no request issuance is in place

# SAS
# REQUEST_BORROW
# ACCEPT_BORROW (NO REQUEST_ISSUANCE)
# ACCEPT_ISSUANCE

# PMS
# REQUEST_ISSUANCE
# RETURNED

TRANSACTION_STATUS = ["REQUEST_BORROW", "ACCEPT_BORROW", "REQUEST_ISSUANCE", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT", "RETURNED", "TRANSFERRED_TO_PMS"]
DECLINED_STATUS = ["DECLINE_BORROW", "DECLINE_ISSUANCE"]

import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
from datetime import datetime as dt

from app.dependency import get_db_config
from app.auth_helper import auth_account
from app.dataclass import AppError, ErrorLog

from app.dataclass import Notification, ParsedNotification

def parser(mode: str) -> str:
    match mode:
        case "REQUEST_BORROW":
            msg = "A request for borrow has been submitted. Please review it in time."
        case "ACCEPT_BORROW":
            msg = "A borrow request has been accepted, and is awaiting an issuance request."
        case "REQUEST_ISSUANCE":
            msg = "A request for issuance has been submitted. Please review it in time."
        case "ACCEPT_ISSUANCE":
            msg = "An issuance request has been approved. Please prepare the stocks that will be given to the student, and take down their conditions."
        case "RETURNED":
            msg = "A student has returned borrowed items to the SAS. Review all of them to tag if they are available for future borrowing, need of repair, or will be decommissioned."
        case _:
            msg = "Invalid Notification"
    return msg

def get_all_via_account_id(logged: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT role FROM accounts WHERE id = %s AND is_active = TRUE", (logged,))
                role = cur.fetchone()
                if not role:
                    raise AppError(ErrorLog(
                        subject="Account Not Found", 
                        message="The account logged in is not found in the database.",
                    ))
                
                cur.execute("SELECT * FROM notifications WHERE account_id = %s", (logged,))
                notification = cur.fetchall()
                if not notification or notification == []:
                    raise AppError(ErrorLog(
                        subject="No Notification", 
                        message="Your account does not have any notification.",
                    ))
                
                returning = []
                for n in notification:
                    notif = Notification(
                        id=n["id"],
                        mode=n["mode"],
                        account_id=n["account_id"],
                        transaction_id=n["transaction_id"],
                        is_read=n["is_read"],
                        is_processed=n["is_processed"],
                        date=n["date"]
                    )
                    p = parser(n["mode"])
                    returning.append(ParsedNotification(
                        notification=notif,
                        content=p
                    ))
                return returning, None
    except AppError as a:
        if not a.log.func:
            a.log.func = "get_all_via_account_id"
        if not a.log.module:
            a.log.module = "notification"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="get_all_via_account_id", module="notification"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_all_via_account_id", module="notification"
        )
    finally:
        if conn:
            conn.close()

def read_all(logged: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT role FROM accounts WHERE id = %s AND is_active = TRUE", (logged,))
                role = cur.fetchone()
                if not role:
                    raise AppError(ErrorLog(
                        subject="Account Not Found", 
                        message="The account logged in is not found in the database.",
                    ))
                
                cur.execute("UPDATE notifications SET is_read = TRUE WHERE account_id = %s", (logged,))
                return True, None
    except AppError as a:
        if not a.log.func:
            a.log.func = "read_all"
        if not a.log.module:
            a.log.module = "notification"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="read_all", module="notification"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="read_all", module="notification"
        )
    finally:
        if conn:
            conn.close()

def read_unread_one(logged: int, notification_id: int, to_read: bool):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM notifications WHERE id = %s", (notification_id,))
                n = cur.fetchone()
                if not n:
                    raise AppError(ErrorLog(
                        subject="Notification Not Found", 
                        message="The selected notification does not exist in the database.",
                    ))
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, id_needed=n["account_id"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                cur.execute("UPDATE notifications SET is_read = %s WHERE id = %s", (to_read, notification_id))
                
                return Notification(
                    id=n["id"],
                    mode=n["mode"],
                    account_id=n["account_id"],
                    transaction_id=n["transaction_id"],
                    is_read=to_read,
                    is_processed=n["is_processed"],
                    date=n["date"]
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "read_unread_one"
        if not a.log.module:
            a.log.module = "notification"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="read_unread_one", module="notification"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="read_unread_one", module="notification"
        )
    finally:
        if conn:
            conn.close()

def request_borrow(transaction_id: int, conn, cur):
    try:
        cur.execute("""
            SELECT id FROM accounts WHERE role = ANY(%s) AND is_active = TRUE            
        """, (["SAS", "ADMIN"],))
        res = cur.fetchall()
        accounts_ids = [x["id"] for x in res]
        now = dt.now()

        insert_query = """
            INSERT INTO notifications 
            (mode, account_id, transaction_id, date)
            VALUES %s
        """
        values = (
            ("REQUEST_BORROW", account_id, transaction_id, now)
            for account_id in accounts_ids 
        )

        execute_values(cur, insert_query, values)
        return True
    except Exception as e:
        print(e)
        return False

def accept_borrow(transaction_id: int, conn, cur):
    try:
        cur.execute("""
            SELECT id FROM accounts WHERE role = ANY(%s) AND is_active = TRUE            
        """, (["SAS", "ADMIN"],))
        res = cur.fetchall()
        accounts_ids = [x["id"] for x in res]
        now = dt.now()

        insert_query = """
            INSERT INTO notifications 
            (mode, account_id, transaction_id, date)
            VALUES %s
        """
        insert_values = (
            ("ACCEPT_BORROW", account_id, transaction_id, now)
            for account_id in accounts_ids 
        )

        update_query = """
            UPDATE notifications
            SET is_processed = TRUE
            WHERE transaction_id = %s
            AND mode = %s
        """
        update_values = (transaction_id, "REQUEST_BORROW")

        execute_values(cur, insert_query, insert_values)
        cur.execute(update_query, update_values)
        return True
    except Exception as e:
        print(e)
        return False

def request_issuance(transaction_id: int, conn, cur):
    try:
        cur.execute("""
            SELECT id FROM accounts WHERE role = ANY(%s) AND is_active = TRUE            
        """, (["PMS", "ADMIN"],))
        res = cur.fetchall()
        accounts_ids = [x["id"] for x in res]
        now = dt.now()

        insert_query = """
            INSERT INTO notifications 
            (mode, account_id, transaction_id, date)
            VALUES %s
        """
        values = (
            ("REQUEST_ISSUANCE", account_id, transaction_id, now)
            for account_id in accounts_ids 
        )
        update_query = """
            UPDATE notifications
            SET is_processed = TRUE
            WHERE transaction_id = %s
            AND mode = ANY(%s)
        """
        update_values = (transaction_id, ["REQUEST_BORROW", "ACCEPT_BORROW"])

        execute_values(cur, insert_query, values)
        cur.execute(update_query, update_values)
        return True
    except Exception as e:
        print(e)
        return False

def accept_issuance(transaction_id: int, conn, cur):
    try:
        cur.execute("""
            SELECT id FROM accounts WHERE role = ANY(%s) AND is_active = TRUE            
        """, (["SAS", "ADMIN"],))
        res = cur.fetchall()
        accounts_ids = [x["id"] for x in res]
        now = dt.now()

        insert_query = """
            INSERT INTO notifications 
            (mode, account_id, transaction_id, date)
            VALUES %s
        """
        values = (
            ("ACCEPT_ISSUANCE", account_id, transaction_id, now)
            for account_id in accounts_ids 
        )
        update_query = """
            UPDATE notifications
            SET is_processed = TRUE
            WHERE transaction_id = %s
            AND mode = %s
        """
        update_values = (transaction_id, "REQUEST_ISSUANCE")

        execute_values(cur, insert_query, values)
        cur.execute(update_query, update_values)
        return True
    except Exception as e:
        print(e)
        return False

def transfer_to_student(transaction_id: int, conn, cur):
    try:
        update_query = """
            UPDATE notifications
            SET is_processed = TRUE
            WHERE transaction_id = %s
            AND mode = %s
        """
        update_values = (transaction_id, "ACCEPT_ISSUANCE")

        cur.execute(update_query, update_values)
        return True
    except Exception as e:
        print(e)
        return False

def returned(transaction_id: int, conn, cur):
    try:
        cur.execute("""
            SELECT id FROM accounts WHERE role = ANY(%s) AND is_active = TRUE            
        """, (["PMS", "ADMIN"],))
        res = cur.fetchall()
        accounts_ids = [x["id"] for x in res]
        now = dt.now()

        insert_query = """
            INSERT INTO notifications 
            (mode, account_id, transaction_id, date)
            VALUES %s
        """
        values = (
            ("RETURNED", account_id, transaction_id, now)
            for account_id in accounts_ids 
        )

        execute_values(cur, insert_query, values)
        return True
    except Exception as e:
        print(e)
        return False
    
def transfer_to_pms(transaction_id: int, conn, cur):
    try:
        update_query = """
            UPDATE notifications
            SET is_processed = TRUE
            WHERE transaction_id = %s
            AND mode = %s
        """
        update_values = (transaction_id, "RETURNED")

        cur.execute(update_query, update_values)
        return True
    except Exception as e:
        print(e)
        return False