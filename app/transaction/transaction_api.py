from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.dataclass import Transaction, Transaction_Event, Transaction_Stock, FullTransaction

import app.dependency as d

import app.transaction.transaction as t
import app.transaction.transaction_model as tm
import app.transaction.transaction_serializer as ts

router = APIRouter()

@router.get("/get_all/")
async def get_all_api(logged: int = Depends(d.get_current_user)):
    transactions, error = t.get_all_via_account_id(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transactions": [ts.serialize_full(transaction) for transaction in transactions]}

@router.post("/request_borrow/")
async def request_borrow_api(request: tm.RequestBorrow, logged: int = Depends(d.get_current_user)):
    transaction, error = t.request_borrow(
        logged=logged,
        student_number=request.student_number,
        item_id=request.item_id,
        quantity=request.quantity
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/accept_borrow/")
async def accept_borrow_api(request: tm.AcceptBorrow, logged: int = Depends(d.get_current_user)):
    transaction, error = t.respond_borrow(
        logged=logged,
        transaction_id=request.transaction_id,
        to_issuance=request.to_issuance,
        status="ACCEPT"
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/decline_borrow/")
async def decline_borrow_api(request: tm.DeclineBorrow, logged: int = Depends(d.get_current_user)):
    transaction, error = t.respond_borrow(
        logged=logged,
        transaction_id=request.transaction_id,
        comment=request.comment,
        status="DECLINE"
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/request_issuance/")
async def request_issuance_api(request: tm.RequestIssuance, logged: int = Depends(d.get_current_user)):
    transaction, error = t.request_issuance(
        logged=logged,
        transaction_id=request.transaction_id
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/accept_issuance/")
async def accept_issuance_api(request: tm.AcceptIssuance, logged: int = Depends(d.get_current_user)):
    transaction, error = t.respond_issuance(
        logged=logged,
        transaction_id=request.transaction_id,
        status="ACCEPT"
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/decline_issuance/")
async def decline_issuance_api(request: tm.DeclineIssuance, logged: int = Depends(d.get_current_user)):
    transaction, error = t.respond_issuance(
        logged=logged,
        transaction_id=request.transaction_id,
        comment=request.comment,
        status="DECLINE"
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/transfer_to_student/")
async def transfer_to_student_api(request: tm.TransferToStudent, logged: int = Depends(d.get_current_user)):
    transaction, error = t.transfer_to_student(
        logged=logged,
        transaction_id=request.transaction_id,
        custom_condition_sn=request.custom_condition_sn,
        custom_conditions=request.custom_conditions
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/return/")
async def for_return_api(request: tm.ForReturn, logged: int = Depends(d.get_current_user)):
    transaction, error = t.for_return(
        logged=logged,
        transaction_id=request.transaction_id,
        custom_condition_sn=request.custom_condition_sn,
        custom_conditions=request.custom_conditions
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}

@router.post("/transfer_to_pms/")
async def transfer_to_pms_api(request: tm.TransferToPMS, logged: int = Depends(d.get_current_user)):
    transaction, error = t.transfer_to_pms(
        logged=logged,
        transaction_id=request.transaction_id,
        custom_condition_sn=request.custom_condition_sn,
        custom_condition_status=request.custom_condition_status
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transaction": ts.serialize_transaction(transaction)}