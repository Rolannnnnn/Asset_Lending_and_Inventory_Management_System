from pydantic import BaseModel
from typing import Optional

class EditDetail(BaseModel):
    student_number: str
    year: int
    section: str
    email: str
    contact_number: Optional[str] = None

class EditStatus(BaseModel):
    student_number: str
    to_active: bool