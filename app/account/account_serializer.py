from app.dataclass import Account

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