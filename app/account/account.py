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

def edit_details(logged: int, account_id: int, name: str, role: str, email: str, contact_number: str = None):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[name, role, email], ints=[account_id])
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

        # Check role validity
        if role not in ROLES_ALLOWED:
            raise AppError(ErrorLog(
                subject="Invalid Role",
                message=f"Limit role to: {ROLES_ALLOWED}",
            ))
        
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN"], id_needed=account_id):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                # checking if the account exists
                cur.execute("SELECT * FROM accounts WHERE id = %s", (account_id,))
                result = cur.fetchone()
                if not result:
                    raise AppError(ErrorLog(
                        subject="Account Not Found", 
                        message="The account with this ID provided is not found.",
                    ))

                # If removing admin role, ensure at least 1 active admin remains
                if result["role"] == "ADMIN" and role != "ADMIN":
                    cur.execute("SELECT COUNT(*) AS admin_count FROM accounts WHERE role = %s AND is_active = TRUE", ("ADMIN",))
                    if cur.fetchone()["admin_count"] <= 1:
                        raise AppError(ErrorLog(
                            subject="Admin Count Error", 
                            message="There should at least be 1 active admin account.",
                        ))

                cur.execute("""
                    UPDATE accounts SET 
                        name = %s, role = %s, email = %s, contact_number = %s
                    WHERE id = %s
                """, (name, role, email, contact_number, account_id))
                return Account(
                    id=account_id,
                    name=name,
                    email=email,
                    contact_number=contact_number,
                    role=role,
                    is_active=result["is_active"],
                    username=result["username"]
                ), None
    except AppError as a:
        a.log.func, a.log.module = "edit_account_details", "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",
            message="There was a problem communicating with the database.",
            func="edit_account_details",
            module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_account_details", module="account"
        )
    finally:
        if conn:
            conn.close()

# SET T0_ACTIVE TO TRUE IF INACTIVE -> ACTIVE, AND VICE VERSA
def edit_status(logged: int, account_id: int, to_active: bool):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[account_id], bools=[to_active])
        if strict == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))
        elif strict == 4:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some boolean fields are empty or invalid."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                # Check if an ID account exists
                cur.execute("SELECT * FROM accounts WHERE id = %s", (account_id,))
                result = cur.fetchone()
                if not result:
                    raise AppError(ErrorLog(
                        subject="Account Not Found",
                        message=f"No account found with this ID {account_id}.",
                    ))
                if result["is_active"] == to_active:
                    raise AppError(ErrorLog(
                        subject="Already at Desired State",
                        message=f"The account is already at the given status.",
                    ))
                
                cur.execute("UPDATE accounts SET is_active = %s WHERE id = %s", (to_active, account_id))
                return Account(
                    id=result["id"],
                    name=result["name"],
                    email=result["email"],
                    contact_number=result["contact_number"],
                    role=result["role"],
                    is_active=to_active,
                    username=result["username"],
                    ), None
    except AppError as a:
        if not a.log.func:
            a.log.func = "edit_status"
        if not a.log.module:
            a.log.module = "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error", message="There was a problem communicating with the database.",
            func="edit_status", module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_status", module="account"
        )
    finally:
        if conn:
            conn.close()

def edit_credentials(logged: int, account_id: int, new_username: str, new_password: str):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(strings=[new_username, new_password], ints=[account_id])
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
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN"], id_needed=account_id):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                # Check if account id exists
                cur.execute("SELECT * FROM accounts WHERE id = %s ", (account_id,))
                r = cur.fetchone()
                if not r:
                    raise AppError(ErrorLog(
                        subject="Account Not Found",
                        message=f"No account found with this ID {account_id}.",
                    ))

                # Checks if the new username already exists
                cur.execute("SELECT id FROM accounts WHERE username = %s AND id != %s", 
                    (new_username, account_id)
                )
                if cur.fetchone():
                    raise AppError(ErrorLog(
                        subject="Username Already Exists",
                        message="Provide a different username.",
                    ))

                # Update credentials
                hashed_password = bcrypt.hashpw(new_password.encode
                ('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur.execute("""
                    UPDATE accounts SET username = %s, hash_password = %s
                    WHERE id = %s
                """, (new_username, hashed_password, account_id))

                return Account(
                        id=r["id"],
                        name=r["name"],
                        email=r["email"],
                        contact_number=r["contact_number"],
                        role=r["role"],
                        is_active=True,
                        username=new_username
                    ), None
    except AppError as a:
        a.log.func, a.log.module = "edit_credentials", "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",
            message="There was a problem communicating with the database.",
            func="edit_credentials",
            module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="edit_credentials", module="account"
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
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN"]):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                cur.execute("SELECT * FROM accounts")
                accounts = cur.fetchall()
                if accounts is None or accounts == []:
                    raise AppError(ErrorLog(
                        subject="No Account", 
                        message="No Accounts found in the database.",
                    ))
                
                returning = []
                for r in accounts:
                    returning.append(Account(
                        id=r["id"],
                        name=r["name"],
                        email=r["email"],
                        contact_number=r["contact_number"],
                        role=r["role"],
                        is_active=r["is_active"],
                        username=r["username"]
                    ))
                return returning, None
    except AppError as a:
        a.log.func, a.log.module = "get_all", "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",
            message="There was a problem communicating with the database.",
            func="get_all",
            module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_all", module="account"
        )
    finally:
        if conn:
            conn.close()

def get_via_account_id(logged: int, account_id: int):
    conn = None
    try:
        # Check Parameters
        strict = check.check_strict_parameters(ints=[account_id])
        if strict == 1:
            raise AppError(ErrorLog(
                subject="Invalid Input", message="Some integer fields are empty or invalid."
            ))

        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if not auth_account(logged=logged, or_mode=True, conn=conn, cur=cur, role_needed=["ADMIN"], id_needed=account_id):
                    raise AppError(ErrorLog(
                        subject="Forbidden", 
                        message="You do not have authorization to make this action.",
                    ))

                cur.execute("SELECT * FROM accounts WHERE id = %s", (account_id,))
                r = cur.fetchone()
                if not r:
                    raise AppError(ErrorLog(
                        subject="Account Not Found", 
                        message="The selected account is not found in the database.",
                    ))
                
                return Account(
                    id=r["id"],
                    name=r["name"],
                    email=r["email"],
                    contact_number=r["contact_number"],
                    role=r["role"],
                    is_active=r["is_active"],
                    username=r["username"]
                )
    except AppError as a:
        a.log.func, a.log.module = "get_via_account_id", "account"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",
            message="There was a problem communicating with the database.",
            func="get_via_account_id",
            module="account"
        )
    except Exception as e:
        print("INTERNAL ERROR:", e)
        return None, ErrorLog(
            subject="Internal Error", message="There was a problem with the server. Contact administrator",
            func="get_via_account_id", module="account"
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