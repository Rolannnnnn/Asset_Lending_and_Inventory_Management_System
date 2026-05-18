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
    custom_condition_sn: list[str] = Field(default_factory=list)
    custom_conditions: list[str] = Field(default_factory=list)

class TransferToPMS(BaseModel):
    transaction_id: int
    custom_condition_sn: list[str] = Field(default_factory=list)
    custom_condition_status: list[str] = Field(default_factory=list)

class GetDetailed(BaseModel):
    transaction_id: int

class GetStockViaTransaction(BaseModel):
    transaction_id: int

class GetOneFull(BaseModel):
    transaction_id: int