from fastapi import APIRouter, HTTPException, Depends

import app.dependency as d
import app.course.course as c
import app.course.course_model as cm
import app.course.course_serializer as cs

router = APIRouter()

@router.post("/add/")
async def add_course_api(request: cm.AddCourse, logged: int = Depends(d.get_current_user)):
    course, error = c.add_course(
        logged=logged,
        name=request.name,
        code=request.code,
        college=request.college
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"course": cs.serialize_course(course)}

@router.post("/edit/")
async def edit_course_api(request: cm.EditCourse, logged: int = Depends(d.get_current_user)):
    course, error = c.edit_course(
        logged=logged,
        course_id=request.id,
        name=request.name,
        code=request.code,
        college=request.college
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"course": cs.serialize_course(course)}

@router.post("/delete/")
async def delete_course_api(request: cm.DeleteCourse, logged: int = Depends(d.get_current_user)):
    course, error = c.delete_course(
        logged=logged,
        course_id=request.id
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"course": cs.serialize_course(course)}

@router.get("/get/")
async def get_all_api(logged: int = Depends(d.get_current_user)):
    courses, error = c.get_all(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"courses": [cs.serialize_course(course) for course in courses]}