from pydantic import BaseModel, Field
from typing import Optional, List

class RequestBorrow(BaseModel):
    student_number: str
    item_id: int
    quantity: int

class AcceptBorrow(BaseModel):
    transaction_id: int
    to_issuance: bool

class DeclineBorrow(BaseModel):
    transaction_id: int
    comment: str

class RequestIssuance(BaseModel):
    transaction_id: int

class AcceptIssuance(BaseModel):
    transaction_id: int

class DeclineIssuance(BaseModel):
    transaction_id: int
    comment: str

class CustomedCondition(BaseModel):
    serial_number: str = Field(..., min_length=1)
    condition: str = Field(..., min_length=1)

class TransferToStudent(BaseModel):
    transaction_id: int
    custom_update: Optional[List[CustomedCondition]] = []

class ForReturn(BaseModel):
    transaction_id: int
    custom_update: Optional[List[CustomedCondition]] = []

class CustomedStatus(BaseModel):
    serial_number: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)

class TransferToPMS(BaseModel):
    transaction_id: int
    custom_update: List[CustomedStatus]

class GetDetailed(BaseModel):
    transaction_id: int

class GetStockViaTransaction(BaseModel):
    transaction_id: int

class GetOneFull(BaseModel):
    transaction_id: int