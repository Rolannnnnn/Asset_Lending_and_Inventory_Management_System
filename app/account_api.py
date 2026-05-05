from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from typing import Optional

from app.dataclass import Account

import app.account as a
import app.dependency as d

from app.auth import create_access_token, get_cookie_max_age

#put = update, post = create, get = read, delete = delete

router = APIRouter()

class AccountLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login/")
async def login_api(request: AccountLoginRequest, response: Response):
    account, error = a.login(
        username=request.username,
        password=request.password,
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    max_age = get_cookie_max_age()
    if not max_age:
        raise HTTPException(status_code=500, detail={
            "subject": "Internal Error",
            "message": "Contact Administrator"
        })
    
    token = create_access_token({
        "account_id": account.id,
        "username": account.username
    })

    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=max_age * 60
    )
    return {"account": serialize_account(account)}

@router.post("/logout/")
async def logout_api(response: Response):
    response.delete_cookie(
        key="session_token",
        path="/",
        httponly=True,
        samesite="lax"
    )

    return {"message": "Account Logged Out"}

@router.get("/me/")
async def cookie_log_api(logged: int = Depends(d.get_current_user_optional)):
    account = a.cookie_login(logged=logged)
    if account:
        return {"account": serialize_account(account)}
    else:
        return {"account": None}

def serialize_account(account: Account):
    return {
        "id": account.id,
        "name": account.name,
        "email": account.email,
        "contact_number": account.contact_number,
        "role": account.role,
        "is_active": account.is_active,
        "username": account.username
    }