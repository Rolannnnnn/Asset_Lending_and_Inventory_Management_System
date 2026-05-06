from app.dataclass import FullImport, Student

def serialize_full_import(imported: FullImport):
    return {
        "uuid": imported.imported.uuid,
        "file_name": imported.imported.file_name,
        "file_path": imported.imported.file_path,
        "file_size": imported.imported.file_size,
        "mime_type": imported.imported.mime_type,
        "date": imported.imported.date,
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