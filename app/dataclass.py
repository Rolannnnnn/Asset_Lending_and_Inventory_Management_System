from dataclasses import dataclass
from datetime import datetime

@dataclass
class Transaction:
    id: int
    status: str
    student_number: str
    item_id: int

@dataclass
class Item:
    id: int
    name: str
    description: str
    is_available: bool
    image_uuid: str | None = None

@dataclass
class ItemWithImage:
    item: Item
    image_path: str | None = None

@dataclass
class Stock:
    item_id: int
    serial_number: str
    status: str
    condition: str

@dataclass
class FullItem:
    item: ItemWithImage
    stocks: list[Stock]

@dataclass
class Transaction_Event:
    type: str
    date: datetime
    personnel_id: int
    personnel_name: str
    comment: str | None = None

@dataclass
class Transaction_Stock:
    serial_number: str
    condition_releasing: str | None = None
    condition_returning: str | None = None

@dataclass
class FullTransaction:
    transaction: Transaction
    student_name: str
    student_course_name: str
    student_course_code: str
    student_year: int
    student_section: str
    student_email: str
    item_name: str
    item_description: str
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
    item_name: str
    item_description: str
    quantity: int

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
class FullStudent:
    student_number: str
    name: str
    course_id: int
    course_name: str
    course_code: str
    year: int
    section: str
    email: str
    is_active: bool
    contact_number: str | None = None

@dataclass
class Course:
    id: int
    name: str
    code: str
    college: str

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
class Notification:
    id: int
    mode: str
    account_id: int
    transaction_id: int
    is_read: bool
    is_processed: bool
    date: datetime

@dataclass
class ParsedNotification:
    notification: Notification
    content: str

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