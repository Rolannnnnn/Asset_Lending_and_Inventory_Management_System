from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from app.dataclass import Transaction, Transaction_Event, Transaction_Stock, FullTransaction

import app.dependency as d
import app.transaction as t

router = APIRouter()

@router.get("/get_all/")
async def get_all_api(logged: int = 1):
    transactions, error = t.get_all_via_account_id(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"transactions": [serialize_full(transaction) for transaction in transactions]}

def serialize_full(transaction: FullTransaction):
    return {
        "id": transaction.transaction.id,
        "status": transaction.transaction.status,
        "student_number": transaction.transaction.student_number,
        "stocks": [serialize_stock(s) for s in transaction.stocks],
        "events": [serialize_event(e) for e in transaction.events]
    }

def serialize_stock(stock: Transaction_Stock):
    return {
        "serial_number": stock.serial_number,
        "condition_releasing": stock.condition_releasing,
        "condition_returning": stock.condition_returning
    }

def serialize_event(event: Transaction_Event):
    return {
        "type": event.type,
        "date": event.date.isoformat() if event.date else None,
        "personnel_id": event.personnel_id,
        "comment": event.comment
    }