from pydantic import BaseModel

class ReportGeneration(BaseModel):
    transaction_id: int
    extension: str