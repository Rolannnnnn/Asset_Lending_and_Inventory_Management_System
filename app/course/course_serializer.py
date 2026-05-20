from app.dataclass import Course

def serialize_course(course: Course):
    return {
        "id": course.id,
        "name": course.name,
        "code": course.code,
        "college": course.college
    }