from dataclasses import dataclass
from datetime import datetime

@dataclass
class Transaction:
    id: int
    status: str
    student_number: str
    item_id: int

@dataclass
class Transaction_Event:
    type: str
    date: datetime
    personnel_id: int
    comment: str | None = None

@dataclass
class Transaction_Stock:
    serial_number: str
    condition_releasing: str | None = None
    condition_returning: str | None = None

@dataclass
class FullTransaction:
    transaction: Transaction
    events: list[Transaction_Event]
    stocks: list[Transaction_Stock]

@dataclass
class DetailedTransaction:
    transaction_id: int
    student_number: str
    student_name: str
    student_course: str
    student_year: int
    student_section: str
    student_email: str
    sas_name: str
    item_name: str
    quantity: int
    date: datetime

@dataclass
class Student:
    student_number: str
    name: str
    course_id: int
    year: int
    section: str
    email: str
    is_active: bool
    contact_number: str | None = None

@dataclass
class Import:
    uuid: str
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    date: datetime

@dataclass
class FullImport:
    imported: Import
    inserted: int
    updated: int

@dataclass
class Account:
    id: int
    name: str
    role: str
    email: str
    username: str
    is_active: bool
    contact_number: str | None = None

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