from pydantic import BaseModel

class AccountLoginRequest(BaseModel):
    username: str
    password: str