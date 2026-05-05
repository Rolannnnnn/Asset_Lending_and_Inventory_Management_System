import psycopg2
from psycopg2.extras import RealDictCursor, execute_values, execute_batch
from datetime import datetime as dt
import bcrypt

from app.auth_helper import auth_account
from app.auth import verify_password
from app.dependency import get_db_config
import app.general_checker as check

from app.dataclass import AppError, ErrorLog
from app.dataclass import Account

ROLES_ALLOWED = ["ADMIN", "PMS", "SAS"]

def create_account(logged: int, name: str, role: str, username: str, password: str, email: str, contact_number: str = None):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[name, role, username, password, email])
        nullable = check.check_nullable_parameters(strings=[contact_number])
        if strict == 1 or nullable == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))
        elif strict == 2 or nullable == 2:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty or invalid."
            ))
        elif strict == 3:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some string fields are empty."
            ))
        
        if contact_number is not None and not contact_number.strip():
            contact_number = None

        # Check position
        if role not in ROLES_ALLOWED:
            raise AppError(ErrorLog(
                subject="Invalid Role",    
                message="Limit role to admin, personnel, tv.",
            ))
    
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                # Check if username already exists
                cur.execute("SELECT id FROM accounts WHERE username = %s", 
                    (username,)
                )
                if cur.fetchone():
                    raise AppError(ErrorLog(
                        subject="Username Already Exists", 
                        message="Provide a different username.",
                    ))
                
                # Push to Database
                hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur.execute("""
                    INSERT INTO accounts (name, role, email, contact_number, username, hash_password)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, 
                    (name, role, email, contact_number, username, hashed_password)
                )
                account_id = cur.fetchone()["id"]

                return Account(
                    id=account_id,
                    name=name,
                    email=email,
                    contact_number=contact_number,
                    role=role,
                    is_active=True,
                    username=username
                ), None
    except AppError as a:
        a.log.func, a.log.module = "create_account", "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",  
            message="There was a problem communicating with the database.",
            func="create_account", 
            module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="create_account", module="account"
        )
    finally:
        if conn:
            conn.close()

def login(username: str, password: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[username, password])
        if strict == 2:
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
                cur.execute("""
                    SELECT * FROM accounts
                    WHERE username = %s and is_active = %s
                    """, 
                    (username, True)
                )
                r = cur.fetchone()

                if not r:
                    raise AppError(ErrorLog(
                        subject="Wrong Credentials",   
                        message="Incorrect username or password.",
                    ))

                if r and verify_password(password, r["hash_password"]):
                    return Account(
                        id=r["id"],
                        name=r["name"],
                        email=r["email"],
                        contact_number=r["contact_number"],
                        role=r["role"],
                        is_active=True,
                        username=r["username"],
                    ), None
                else:
                    raise AppError(ErrorLog(
                        subject="Wrong Credentials",   
                        message="Incorrect username or password.",
                    ))
    except AppError as a:
        a.log.func, a.log.module = "login", "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",
            message="There was a problem communicating with the database.",
            func="login",
            module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="login", module="account"
        )
    finally:
        if conn:
            conn.close()

def cookie_login(logged: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM accounts
                    WHERE id = %s            
                """, (logged,))
                account = cur.fetchone()
                
                if not account:
                    return None
                
                return Account(
                    id= account["id"],
                    name=account["name"],
                    email=account["email"],
                    role=account["role"],
                    is_active=account["is_active"],
                    username=account["username"],
                    contact_number=account["contact_number"],
                )
    except Exception:
        return None
    finally:
        if conn:
            conn.close()