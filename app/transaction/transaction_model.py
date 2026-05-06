from pydantic import BaseModel, Field

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

class TransferToStudent(BaseModel):
    transaction_id: int
    custom_condition_sn: list[str] = Field(default_factory=list)
    custom_conditions: list[str] = Field(default_factory=list)

class ForReturn(BaseModel):
    transaction_id: int
    custom_condition_sn: list[str] = Field(default_factory=list)
    custom_conditions: list[str] = Field(default_factory=list)

class TransferToPMS(BaseModel):
    transaction_id: int
    custom_condition_sn: list[str] = Field(default_factory=list)
    custom_condition_status: list[str] = Field(default_factory=list)