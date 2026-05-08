import psycopg2
from psycopg2.extras import RealDictCursor
import os, magic, uuid, re
from datetime import datetime as dt

import app.general_checker as check
from app.dependency import get_db_config
from app.auth_helper import auth_account

from app.dataclass import AppError, ErrorLog
from app.dataclass import Item

IMAGE_UPLOAD_DIR = os.path.abspath("item_images")
MAX_MB = 10
ALLOWED_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
}

def attach_image(logged: int, file_bytes: bytes, item_id: int, item_name: str = "", conn = None, cur = None):
    own_conn = False
    successful = False
    path = None
    try:
        if conn is None or cur is None:
            own_conn = True
            conn = psycopg2.connect(get_db_config())
            cur = conn.cursor(cursor_factory=RealDictCursor)
  
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id])
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
        if file_bytes is None:
            raise AppError(ErrorLog(
                subject="No File Attached", 
                message="There is no attached file. Please make sure the file is properly attached before proceeding."
            ))
        if not isinstance(file_bytes, bytes):
            raise AppError(ErrorLog(
                subject="Invalid File", 
                message="File is not formatted correctly."
            ))

        # Checkers if the Request is an Independent request
        if own_conn:
            if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["PMS", "ADMIN"]):
                raise AppError(ErrorLog(
                    subject="Forbidden", 
                    message="You do not have authorization to make this action.",
                ))
            cur.execute("SELECT name FROM items WHERE id = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                raise AppError(ErrorLog(
                    subject="Item Not Found", 
                    message="The selected item is not found in the database.",
                ))
            item_name = item["name"]

        os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)

        # Check File Type and Size
        mime = magic.from_buffer(file_bytes, mime=True)
        if mime not in ALLOWED_MIME:
            raise AppError(ErrorLog(
                subject="File Invalid", 
                message="Please provide a valid image file as attachment.",
            ))
        
        MAX_SIZE = MAX_MB * 1024 * 1024
        if len(file_bytes) > MAX_SIZE:
            raise AppError(ErrorLog(
                subject="File Too Large",
                message=f"File exceeds {MAX_MB}MB limit."
            ))

        # Construct UUID and File Name
        file_id = str(uuid.uuid4())
        ext = ALLOWED_MIME.get(mime, "")
        clean_name = re.sub(r'[^a-zA-Z0-9_-]', '', item_name.replace(' ', '_'))
        filename = f"{clean_name}-{file_id}{ext}"

        # Save File
        file_path = os.path.join(IMAGE_UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        path = file_path
        file_size = len(file_bytes)

        date = dt.now()

        cur.execute("""
            INSERT INTO images (uuid, file_name, mime_type, file_size, file_path, date)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (file_id, filename, mime, file_size, file_path, date))

        cur.execute("""
            UPDATE items SET image_uuid = %s WHERE id = %s
            RETURNING *
        """, (file_id, item_id))
        r = cur.fetchone()

        successful = True
        if own_conn:
            conn.commit()

        return Item(
            id = item_id,
            name = r["name"],
            description=r["description"],
            image_uuid=r["image_uuid"],
            is_available=r["is_available"]
        ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "attach_image"
        if not a.log.module:
            a.log.module = "item_image"
        print(a.log)
        if own_conn:
            conn.rollback()
            return None, a.log
        raise
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        error = AppError(ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="attach_image", module="item_image"
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
            func="attach_image", module="item_image"
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
        if not successful and path is not None and os.path.exists(path):
            os.remove(path)

def edit_attach(logged: int, file_bytes: bytes, item_id: int):
    conn = None
    successful = False
    path = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id])
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
        if file_bytes is None:
            raise AppError(ErrorLog(
                subject="No File Attached", 
                message="There is no attached file. Please make sure the file is properly attached before proceeding."
            ))
        if not isinstance(file_bytes, bytes):
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
                        message="You do not have authorization to make this action.",
                    ))

                os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)

                # Check File Type and Size
                mime = magic.from_buffer(file_bytes, mime=True)
                if mime not in ALLOWED_MIME:
                    raise AppError(ErrorLog(
                        subject="File Invalid", 
                        message="Please provide a valid image file as attachment.",
                    ))
                
                MAX_SIZE = MAX_MB * 1024 * 1024
                if len(file_bytes) > MAX_SIZE:
                    raise AppError(ErrorLog(
                        subject="File Too Large",
                        message=f"File exceeds {MAX_MB}MB limit."
                    ))
                
                cur.execute("SELECT * FROM items WHERE id = %s", (item_id,))
                item = cur.fetchone()
                if not item:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item is not found in the database.",
                    ))
                if item["image_uuid"] is None or item["image_uuid"] == "":
                    raise AppError(ErrorLog(
                        subject="Attachment Not Set", 
                        message="The selected item has no attachment, and cannot be edited. Please add attachment instead.",
                    ))
                cur.execute("SELECT * FROM images WHERE uuid = %s", (item["image_uuid"],))
                image = cur.fetchone()
                if not image:
                    raise AppError(ErrorLog(
                        subject="Image Not Found",
                        message=f"The image file associated with this item is not found."
                    ))
                item_name = item["name"]
                
                # Re-Construct File
                file_id = str(image["uuid"])
                ext = ALLOWED_MIME.get(mime, "")
                clean_name = re.sub(r'[^a-zA-Z0-9_-]', '', item_name.replace(' ', '_'))
                new_filename = f"{clean_name}-{file_id}{ext}"
                new_file_path = os.path.join(IMAGE_UPLOAD_DIR, new_filename)

                path = new_file_path
                with open(new_file_path, "wb") as f:
                    f.write(file_bytes)
                file_size = len(file_bytes)

                date = dt.now()

                cur.execute("""
                    UPDATE images SET
                    file_name = %s,
                    mime_type = %s,
                    file_size = %s,
                    file_path = %s,
                    date = %s
                    WHERE uuid = %s
                """, (new_filename, mime, file_size, new_file_path, date, file_id))

                successful = True

                old_full_path = os.path.join(IMAGE_UPLOAD_DIR, image["file_path"])
                if os.path.exists(old_full_path) and old_full_path != new_file_path:
                    os.remove(old_full_path)

                return Item(
                    id = item_id,
                    name = item["name"],
                    description=item["description"],
                    image_uuid=file_id,
                    is_available=item["is_available"]
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "edit_attach"
        if not a.log.module:
            a.log.module = "item_image"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_attach", module="item_image"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_attach", module="item_image"
        )
    finally:
        if conn:
            conn.close()
        if not successful and path is not None and os.path.exists(path):
            os.remove(path)

def remove_attach(logged: int, item_id: int):
    conn = None
    successful = False
    image = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[item_id])
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
                        message="You do not have authorization to make this action.",
                    ))

                cur.execute("SELECT * FROM items WHERE id = %s", (item_id,))
                item = cur.fetchone()
                if not item:
                    raise AppError(ErrorLog(
                        subject="Item Not Found", 
                        message="The selected item is not found in the database.",
                    ))
                if item["image_uuid"] is None or item["image_uuid"] == "":
                    raise AppError(ErrorLog(
                        subject="Attachment Not Set", 
                        message="The selected item has no attachment, and cannot be deleted.",
                    ))
                
                cur.execute("DELETE FROM images WHERE uuid = %s RETURNING file_path", (item["image_uuid"],))
                image = cur.fetchone()
                if not image:
                    raise AppError(ErrorLog(
                        subject="Image Not Found",
                        message=f"The image file associated with this item is not found."
                    ))
                cur.execute("UPDATE items SET image_uuid = NULL WHERE id = %s", (item_id,))

                successful = True

                return Item(
                    id = item_id,
                    name = item["name"],
                    description=item["description"],
                    image_uuid=None,
                    is_available=item["is_available"]
                ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "remove_attach"
        if not a.log.module:
            a.log.module = "item_image"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="remove_attach", module="item_image"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="remove_attach", module="item_image"
        )
    finally:
        if conn:
            conn.close()
        if successful and image:
            if os.path.exists(image["file_path"]):
                os.remove(image["file_path"])