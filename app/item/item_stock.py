import psycopg2
from psycopg2.extras import RealDictCursor

import app.general_checker as check
from app.dependency import get_db_config
from app.auth_helper import auth_account

import app.item.item_image as ii

from app.dataclass import AppError, ErrorLog
from app.dataclass import Stock

ITEM_STATUS = ["AVAILABLE", "BORROWED", "FOR_REPAIR", "DECOMMISSIONED"]

def add_stock(logged: int, item_id: int, serial_number: str, status: str, condition: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id], strings=[serial_number, status, condition])
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
        
        if status not in ITEM_STATUS:
            raise AppError(ErrorLog(
                subject="Invalid Status", message=f"Status can only be: {ITEM_STATUS}"
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                serial_number = serial_number.strip().lower()
                condition = condition.strip()

                cur.execute("SELECT EXISTS (SELECT 1 FROM items WHERE id = %s) AS existing", (item_id,))
                if not cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item does not exist in the database.",
                    ))
                
                cur.execute("SELECT EXISTS (SELECT 1 FROM stocks WHERE serial_number = %s) AS existing", (serial_number,))
                if cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Stock Already Exists", 
                        message="An item stock with this serial number already exists.",
                    ))

                cur.execute("""
                    INSERT INTO stocks
                    (serial_number, item_id, status, condition)
                    VALUES (%s, %s, %s, %s)            
                """, (serial_number, item_id, status, condition))
                
                return Stock(
                    item_id=item_id,
                    serial_number=serial_number,
                    status=status,
                    condition=condition
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "add_stock"
        if not a.log.module:
            a.log.module = "item_stock"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="add_stock", module="item_stock"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="add_stock", module="item_stock"
        )
    finally:
        if conn:
            conn.close()

def edit_stock(logged: int, item_id: int, serial_number: str, status: str, condition: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id], strings=[serial_number, status, condition])
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
        
        if status not in ITEM_STATUS:
            raise AppError(ErrorLog(
                subject="Invalid Status", message=f"Status can only be: {ITEM_STATUS}"
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                serial_number = serial_number.strip().lower()
                condition = condition.strip()

                cur.execute("SELECT EXISTS (SELECT 1 FROM items WHERE id = %s) AS existing", (item_id,))
                if not cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item does not exist in the database.",
                    ))
                
                cur.execute("SELECT EXISTS (SELECT 1 FROM stocks WHERE serial_number = %s) AS existing", (serial_number,))
                if not cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Stock Not Found", 
                        message="The selected stock does not exist in the database.",
                    ))

                cur.execute("""
                    UPDATE stocks SET
                    item_id = %s,
                    status = %s,
                    condition = %s
                    WHERE serial_number = %s
                """, (item_id, status, condition, serial_number))
                
                return Stock(
                    item_id=item_id,
                    serial_number=serial_number,
                    status=status,
                    condition=condition
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "edit_stock"
        if not a.log.module:
            a.log.module = "item_stock"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_stock", module="item_stock"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_stock", module="item_stock"
        )
    finally:
        if conn:
            conn.close()