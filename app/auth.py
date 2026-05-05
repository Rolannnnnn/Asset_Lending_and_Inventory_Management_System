from jose import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

import os

ALGORITHM = "HS256"

def get_secret_key():
    key = os.getenv("COOKIE_TOKEN_KEY")

    if not key:
        raise ValueError("Key for Cookie Creation and Verification Not Set")
    return key

def get_cookie_max_age():
    limit = os.getenv("COOKIE_MAX_AGE")
    return int(limit) if limit else 60

def create_access_token(data: dict):
    to_encode = data.copy()

    minutes = get_cookie_max_age()
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes())

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, get_secret_key(), algorithm=ALGORITHM)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)