from app.dataclass import FullImport, Student, FullStudent
from datetime import datetime

def serialize_full_import(imported: FullImport):
    date_val = imported.imported.date
    if isinstance(date_val, datetime):
        date_val = date_val.isoformat()

    return {
        "uuid": imported.imported.uuid,
        "file_name": imported.imported.file_name,
        "file_path": imported.imported.file_path,
        "file_size": imported.imported.file_size,
        "mime_type": imported.imported.mime_type,
        "date": date_val,
        "inserted": imported.inserted,
        "updated": imported.updated
    }

def serialize_student(student: Student):
    return {
        "student_number": student.student_number,
        "name": student.name,
        "course_id": student.course_id,
        "year": student.year,
        "section": student.section,
        "email": student.email,
        "is_active": student.is_active,
        "contact_number": student.contact_number
    }

def serialize_full_student(student: FullStudent):
    return {
        "student_number": student.student_number,
        "name": student.name,
        "course_id": student.course_id,
        "course_name": student.course_name,
        "course_code": student.course_code,
        "year": student.year,
        "section": student.section,
        "email": student.email,
        "is_active": student.is_active,
        "contact_number": student.contact_number
    }