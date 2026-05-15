from app.dataclass import Transaction, Transaction_Event, Transaction_Stock, FullTransaction, DetailedTransaction
from datetime import datetime

def serialize_full(transaction: FullTransaction):
    return {
        "id": transaction.transaction.id,
        "status": transaction.transaction.status,
        "student_number": transaction.transaction.student_number,
        "item_id": transaction.transaction.item_id,
        "student_name": transaction.student_name,
        "student_course_name": transaction.student_course_name,
        "student_course_code": transaction.student_course_code,
        "student_year": transaction.student_year,
        "student_section": transaction.student_section,
        "item_name": transaction.item_name,
        "stocks": [serialize_stock(s) for s in transaction.stocks],
        "events": [serialize_event(e) for e in transaction.events]
    }

def serialize_transaction(transaction: Transaction):
    return {
        "id": transaction.id,
        "status": transaction.status,
        "student_number": transaction.student_number
    }

def serialize_stock(stock: Transaction_Stock):
    return {
        "serial_number": stock.serial_number,
        "condition_releasing": stock.condition_releasing,
        "condition_returning": stock.condition_returning
    }

def serialize_event(event: Transaction_Event):
    date_val = event.date
    if isinstance(date_val, datetime):
        date_val = date_val.isoformat()

    return {
        "type": event.type,
        "date": date_val,
        "personnel_id": event.personnel_id,
        "personnel_name": event.personnel_name,
        "comment": event.comment
    }

def serialize_detailed(detailed: DetailedTransaction):
    return {
        "id": detailed.transaction_id,
        "student_number": detailed.student_number,
        "student_name": detailed.student_name,
        "student_course": detailed.student_course,
        "student_year": detailed.student_year,
        "student_section": detailed.student_section,
        "student_email": detailed.student_email,
        "sas_name": detailed.sas_name,
        "item_name": detailed.item_name,
        "quantity": detailed.quantity,
        "date": detailed.date.isoformat() if detailed.date else None
    }