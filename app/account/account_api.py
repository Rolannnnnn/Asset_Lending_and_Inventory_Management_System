from fastapi import APIRouter, HTTPException, Response, Depends

import app.account.account as a
import app.account.account_model as am
import app.account.account_serializer as acs

import app.dependency as d

from app.auth import create_access_token, get_cookie_max_age

router = APIRouter()

@router.post("/create_account/")
async def create_account_api(request: am.CreateAccount, logged: int = Depends(d.get_current_user)):
    account, error = a.create_account(
        logged=logged,
        name=request.name,
        role=request.role,
        username=request.username,
        password=request.password,
        email=request.email,
        contact_number=request.contact_number
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,   
            "message": error.message
        })
    return {"account": acs.serialize_account(account)}

@router.post("/edit_details/")
async def edit_details_api(request: am.EditDetails, logged: int = Depends(d.get_current_user)):
    account, error = a.edit_details(
        logged=logged,
        account_id=request.account_id,
        name=request.name,
        role=request.role,
        email=request.email,
        contact_number=request.contact_number
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,   
            "message": error.message
        })
    return {"account": acs.serialize_account(account)}

@router.post("/edit_status/")
async def edit_status_api(request: am.EditStatus, logged: int = Depends(d.get_current_user)):
    account, error = a.edit_status(
        logged=logged,
        account_id=request.account_id,
        to_active=request.to_active
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,   
            "message": error.message
        })
    return {"account": acs.serialize_account(account)}

@router.post("/edit_credentials/")
async def edit_credentials_api(request: am.EditCredentials, logged: int = Depends(d.get_current_user)):
    account, error = a.edit_credentials(
        logged=logged,
        account_id=request.account_id,
        new_username=request.new_username,
        new_password=request.new_password
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,   
            "message": error.message
        })
    return {"account": acs.serialize_account(account)}

@router.post("/get_one/")
async def get_one_api(request: am.GetViaAccountID, logged: int = Depends(d.get_current_user)):
    account, error = a.get_via_account_id(
        logged=logged,
        account_id=request.account_id
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,   
            "message": error.message
        })
    return {"account": acs.serialize_account(account)}

@router.get("/get_all/")
async def get_all_api(logged: int = Depends(d.get_current_user)):
    accounts, error = a.get_all(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,   
            "message": error.message
        })
    return {"accounts": [acs.serialize_account(account) for account in accounts]}

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