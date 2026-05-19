from app.dataclass import Notification, ParsedNotification
from datetime import datetime

def serialize_parsed(parsed: ParsedNotification):
    date_val = parsed.notification.date
    if isinstance(date_val, datetime):
        date_val = date_val.isoformat()

    return {
        "id": parsed.notification.id,
        "transaction_id": parsed.notification.transaction_id,
        "account_id": parsed.notification.account_id,
        "mode": parsed.notification.mode,
        "date": date_val,
        "is_read": parsed.notification.is_read,
        "is_processed": parsed.notification.is_processed,
        "content": parsed.content
    }

def serialize_notif(notification: Notification):
    date_val = notification.date
    if isinstance(date_val, datetime):
        date_val = date_val.isoformat()

    return {
        "id": notification.id,
        "transaction_id": notification.transaction_id,
        "account_id": notification.account_id,
        "mode": notification.mode,
        "date": date_val,
        "is_read": notification.is_read,
        "is_processed": notification.is_processed,
    }