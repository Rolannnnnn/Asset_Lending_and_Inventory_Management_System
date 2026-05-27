import psycopg2
from psycopg2.extras import RealDictCursor

from app.dependency import get_db_config
from app.auth_helper import auth_account
import app.general_checker as check    

from app.dataclass import AppError, ErrorLog
from app.dataclass import ItemInventory, Inventory

def inventory(logged: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["SAS", "ADMIN", "PMS"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this changes.",
                    ))
                
                cur.execute("""
                    SELECT 
                        i.id, 
                        i.name,
                        i.description,
                        i.is_available,
                        img.file_path AS path,
                        COUNT(s.item_id) AS total,
                        COUNT(CASE WHEN s.status = 'AVAILABLE' THEN 1 END) AS available,
                        COUNT(CASE WHEN s.status = 'BORROWED' THEN 1 END) AS borrowed,
                        COUNT(CASE WHEN s.status = 'FOR_REPAIR' THEN 1 END) AS for_repair,
                        COUNT(CASE WHEN s.status = 'DECOMMISSIONED' THEN 1 END) AS decommissioned
                    FROM Items i
                    LEFT JOIN stocks s ON i.id = s.item_id
                    LEFT JOIN images img ON i.image_uuid = img.uuid
                    GROUP BY i.id, i.name, i.is_available, i.description, img.file_path;         
                """)
                rows = cur.fetchall()

                if not rows or rows == []:
                    raise AppError(ErrorLog(
                        subject="No Stock or Item", 
                        message="The database does not contain any stock or item at the moment.",
                    ))

                item_list: list[ItemInventory] = []
                for row in rows:
                    if row["path"]:
                        path = check.access_static(row["path"])
                    else:
                        path = None

                    item_list.append(ItemInventory(
                        id=row['id'],
                        name=row['name'],
                        description=row['description'],
                        total=row['total'],
                        available=row['available'],
                        borrowed=row['borrowed'],
                        for_repair=row['for_repair'],
                        decommissioned=row['decommissioned'],
                        is_available=row['is_available'],
                        image_path=path
                    ))

                return Inventory(
                    overall_total=sum(i.total for i in item_list),
                    overall_available=sum(i.available for i in item_list),
                    overall_borrowed=sum(i.borrowed for i in item_list),
                    overall_for_repair=sum(i.for_repair for i in item_list),
                    overall_decommissioned=sum(i.decommissioned for i in item_list),
                    items=item_list
                ), None
    except AppError as a:
        if not a.log.func: a.log.func = "inventory"
        if not a.log.module: a.log.module = "dashboard"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="inventory", module="dashboard"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="inventory", module="dashboard"
        )
    finally:
        if conn:
            conn.close()