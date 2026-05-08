from pydantic import BaseModel

class EditDetailItem(BaseModel):
    item_id: int
    name: str
    description: str

class EditStatusItem(BaseModel):
    item_id: int
    to_active: bool

class RemoveAttachment(BaseModel):
    item_id: int

class AddStock(BaseModel):
    item_id: int
    serial_number: str
    status: str
    condition: str

class EditStock(BaseModel):
    item_id: int
    serial_number: str
    status: str
    condition: str