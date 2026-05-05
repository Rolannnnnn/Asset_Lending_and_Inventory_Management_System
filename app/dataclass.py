from dataclasses import dataclass

@dataclass
class Transaction:
    id: int
    status: str
    stock_serial_number: str
    student_number: str
    student_name: str
    item_condition_releasing: str
    item_condition_borrowing: str | None = None

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