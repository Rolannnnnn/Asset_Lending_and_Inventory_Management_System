from fastapi import Cookie, HTTPException
from jose import jwt, JWTError
from app.auth import get_secret_key, ALGORITHM

from app.dataclass import AppError, ErrorLog
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_config():
    return f"postgresql://{os.getenv('USER')}:{os.getenv('PASSWORD')}@{os.getenv('HOST')}:{os.getenv('PORT')}/{os.getenv('DB_NAME')}"

def check_account(account_id: int):
    conn = None
    try:
        conn = psycopg2.connect(get_db_config())
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT EXISTS (SELECT 1 FROM accounts WHERE id = %s AND is_active = TRUE)", (account_id,))
                res = cur.fetchone()
                if not res or not res[0]:
                    raise AppError(ErrorLog(
                        subject="Account Not Found", 
                        message="Token is correct, but the account is either deactivated or does not exist anymore.",
                    ))
                return account_id, None
    except AppError as a:
        a.log.func, a.log.module = "check_account", "dependency"
        print(a.log)
        return None, a.log
    except psycopg2.Error as e:
        print("DB ERROR:", e)
        return None, ErrorLog(
            subject="Database Error",  
            message="There was a problem communicating with the database.",
            func="check_account", 
            module="dependency"
        )
    finally:
        if conn:
            conn.close()

def get_current_user(session_token: str = Cookie(None)):
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(session_token, get_secret_key(), algorithms=[ALGORITHM])
        account_id = payload.get("account_id")
        _, error = check_account(int(account_id))
        if error:
            raise HTTPException(status_code=401, detail="Not Found")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return account_id

def get_current_user_optional(session_token: str = Cookie(None)):
    if not session_token:
        return None
    try:
        payload = jwt.decode(session_token, get_secret_key(), algorithms=[ALGORITHM])
        account_id = payload.get("account_id")

        account_id = payload.get("account_id")
        _, error = check_account(int(account_id))
        if error:
            return None
        return account_id
    except JWTError:
        return None