from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

import app.dependency as d
import app.student.student as s
import app.student.student_import as si
import app.student.student_serializer as ss
import app.student.student_model as sm

router = APIRouter()

@router.post("/import/")
async def import_api(update: bool = Form(...), file: UploadFile = File(...), logged: int = Depends(d.get_current_user)):
    file_byte = None

    if file:
        content = await file.read()
        file_byte = content
    
    if file_byte is None:
        raise HTTPException(status_code=400, detail={
            "subject": "No Attachment",
            "message": "There is no attachment read. Please ensure that the file is properly attached before proceeding."
        })
    
    results, error = si.check_and_save(logged=logged, file_byte=file_byte)
    if error:
        new_message = "FILE ERROR: " + error.message
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": new_message
        })
    import_file, cols = results
    
    full_import, error = si.import_student(import_file=import_file, update=update, cols=cols)
    if error:
        new_message = "DATABASE ERROR: " + error.message
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": new_message
        })
    
    return {"import": ss.serialize_full_import(full_import)}

@router.post("/edit_detail/")
async def edit_detail_api(request: sm.EditDetail, logged: int = Depends(d.get_current_user)):
    student, error = s.edit_details(
        logged=logged,
        student_number=request.student_number,
        year=request.year,
        section=request.section,
        email=request.email,
        contact_number=request.contact_number
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"student": ss.serialize_student(student)}

@router.post("/edit_status/")
async def edit_status_api(request: sm.EditStatus, logged: int = Depends(d.get_current_user)):
    student, error = s.edit_status(
        logged=logged,
        student_number=request.student_number,
        to_active=request.to_active
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"student": ss.serialize_student(student)}

@router.get("/get_all/")
async def get_all_api(logged: int = Depends(d.get_current_user)):
    students, error = s.get_all_full(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"students": [ss.serialize_full_student(student) for student in students]}