from pydantic import BaseModel

class AddCourse(BaseModel):
    name: str
    code: str
    college: str

class EditCourse(BaseModel):
    id: int
    name: str
    code: str
    college: str