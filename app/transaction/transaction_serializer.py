from app.dataclass import Transaction, Transaction_Event, Transaction_Stock, FullTransaction

def serialize_full(transaction: FullTransaction):
    return {
        "id": transaction.transaction.id,
        "status": transaction.transaction.status,
        "student_number": transaction.transaction.student_number,
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
    return {
        "type": event.type,
        "date": event.date.isoformat() if event.date else None,
        "personnel_id": event.personnel_id,
        "comment": event.comment
    }