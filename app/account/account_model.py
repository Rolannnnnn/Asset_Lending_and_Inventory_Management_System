from pydantic import BaseModel
from typing import Optional

class AccountLoginRequest(BaseModel):
    username: str
    password: str

class CreateAccount(BaseModel):
    name: str
    role: str
    username: str
    password: str
    email: str
    contact_number: Optional[str] = None

class EditDetails(BaseModel):
    account_id: int
    name: str
    email: str
    role: str
    contact_number: Optional[str] = None

class EditStatus(BaseModel):
    account_id: int
    to_active: bool

class EditCredentials(BaseModel):
    account_id: int
    new_username: str
    new_password: str

class GetViaAccountID(BaseModel):
    account_id: int