from dataclasses import dataclass
from datetime import datetime

@dataclass
class Transaction:
    id: int
    status: str
    student_number: str

@dataclass
class Transaction_Event:
    transaction_id: int
    type: str
    date: datetime
    personnel_id: int

@dataclass
class Transaction_Stock:
    transaction_id: int
    serial_number: str
    condition_releasing: str | None = None
    condition_returning: str | None = None

@dataclass
class FullTransaction:
    transaction: Transaction
    events: list[Transaction_Event]
    stocks: list[Transaction_Stock]

@dataclass
class ErrorLog:
    subject: str
    message: str
    func: str | None = None
    module: str | None = None

class AppError(Exception):
    def __init__(self, log: ErrorLog):
        self.log = log
        super().__init__(log.message)