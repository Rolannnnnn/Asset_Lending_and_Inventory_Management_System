from fastapi import APIRouter, HTTPException, Response, Depends
from typing import Optional

import app.account.account as a
import app.account.account_model as am
import app.account.account_serializer as acs

import app.dependency as d

from app.auth import create_access_token, get_cookie_max_age

router = APIRouter()

@router.post("/login/")
async def login_api(request: am.AccountLoginRequest, response: Response):
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
    return {"account": acs.serialize_account(account)}

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
        return {"account": acs.serialize_account(account)}
    else:
        return {"account": None}