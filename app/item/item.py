import psycopg2
from psycopg2.extras import RealDictCursor

import app.general_checker as check
from app.dependency import get_db_config
from app.auth_helper import auth_account

import app.item.item_image as ii

from app.dataclass import AppError, ErrorLog
from app.dataclass import Item, Stock, FullItem

def add_item(logged: int, name: str, description: str, file_bytes: bytes = None):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[name, description])
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
        
        # Check File Basics
        if file_bytes and not isinstance(file_bytes, bytes):
            raise AppError(ErrorLog(
                subject="Invalid File", 
                message="File is not formatted correctly."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                name = name.strip().title()
                description = description.strip()
                cur.execute("""
                    INSERT INTO items (name, description)
                    VALUES (%s, %s)
                    RETURNING id            
                """, (name, description))
                item_id = cur.fetchone()["id"]

                if file_bytes:
                    item, _ = ii.attach_image(
                        logged=logged,
                        file_bytes=file_bytes,
                        item_id=item_id,
                        item_name=name,
                        conn=conn,
                        cur=cur
                    )
                    return item, None
                
                return Item(
                    id = item_id,
                    name = name,
                    description = description,
                    is_available = True,
                    image_uuid = None
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "add_item"
        if not a.log.module:
            a.log.module = "item"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="add_item", module="item"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="add_item", module="item"
        )
    finally:
        if conn:
            conn.close()

def edit_item_details(logged: int, item_id: int, name: str, description: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id], strings=[name, description])
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
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("SELECT EXISTS (SELECT 1 FROM items WHERE id = %s) AS existing", (item_id,))
                if not cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item does not exist in the database.",
                    ))

                name = name.strip().title()
                description = description.strip()
                cur.execute("""
                    UPDATE items
                    SET name = %s,
                    description = %s
                    WHERE id = %s
                    RETURNING *           
                """, (name, description, item_id))
                r = cur.fetchone()
                
                return Item(
                    id = item_id,
                    name = r["name"],
                    description = r["description"],
                    is_available = r["is_available"],
                    image_uuid = r["image_uuid"]
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "edit_item_details"
        if not a.log.module:
            a.log.module = "item"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_item_details", module="item"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_item_details", module="item"
        )
    finally:
        if conn:
            conn.close()

def edit_item_status(logged: int, item_id: int, to_active: bool):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id], bools=[to_active])
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
        elif strict == 4:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some boolean fields are empty."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("SELECT EXISTS (SELECT 1 FROM items WHERE id = %s) AS existing", (item_id,))
                if not cur.fetchone()["existing"]:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item does not exist in the database.",
                    ))

                cur.execute("""
                    UPDATE items
                    SET is_available = %s
                    WHERE id = %s
                    RETURNING *           
                """, (to_active, item_id))
                r = cur.fetchone()
                
                return Item(
                    id = item_id,
                    name = r["name"],
                    description = r["description"],
                    is_available = r["is_available"],
                    image_uuid = r["image_uuid"]
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "edit_item_status"
        if not a.log.module:
            a.log.module = "item"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_item_status", module="item"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_item_status", module="item"
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
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))

                cur.execute("SELECT * FROM items")
                result = cur.fetchall()
                if not result or result == []:
                    raise AppError(ErrorLog(
                        subject="No Item", 
                        message="There is no item found in the database.",
                    ))

                returning = []
                for r in result:
                    returning.append(
                        Item(
                            id = r["id"],
                            name = r["name"],
                            description = r["description"],
                            is_available = r["is_available"],
                            image_uuid = r["image_uuid"]
                        )
                    )
                return returning, None
    except AppError as a:
        if not a.log.func:
            a.log.func = "get_all"
        if not a.log.module:
            a.log.module = "item"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="get_all", module="item"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_all", module="item"
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
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "PMS", "ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))

                cur.execute("""
                    SELECT i.*, 
                        COALESCE(json_agg(s.*) FILTER (WHERE s.id IS NOT NULL), '[]') as stocks
                    FROM items i
                    LEFT JOIN stocks s ON i.id = s.item_id
                    GROUP BY i.id
                """)
                result = cur.fetchall()
                if not result or result == []:
                    raise AppError(ErrorLog(
                        subject="No Item", 
                        message="There is no item found in the database.",
                    ))

                returning = []
                for r in result:
                    stocks = []
                    for x in r["stocks"]:
                        stocks.append(
                            Stock(
                                serial_number=x["serial_number"],
                                status=x["status"],
                                condition=x["condition"],
                                date_acquisition=x["date_acquisition"]
                            )
                        )
                    returning.append(
                        FullItem(
                            item=Item(
                                id=r["id"],
                                name=r["name"],
                                description=r["description"],
                                is_available=r["is_available"],
                                image_uuid=r["image_uuid"]
                            ),
                            stocks=stocks
                        )
                    )

                return returning, None
    except AppError as a:
        if not a.log.func:
            a.log.func = "get_all_full"
        if not a.log.module:
            a.log.module = "item"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="get_all_full", module="item"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_all_full", module="item"
        )
    finally:
        if conn:
            conn.close()