from pydantic import BaseModel

class ReadOne(BaseModel):
    notification_id: int

class UnreadOne(BaseModel):
    notification_id: int