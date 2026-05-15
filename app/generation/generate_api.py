from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import os

import app.dependency as d

import app.generation.generate as g
import app.generation.generate_model as gm

router = APIRouter()

@router.post("/sample/")
async def sample_api(request: gm.ReportGeneration, logged: int = Depends(d.get_current_user)):
    form = "SAMPLE"

    transaction, error = g.validate_and_gather(
        logged=logged,
        transaction_id=request.transaction_id,
        form=form,
        extension=request.extension
    )
    if error:
        msg = f"DATA ERROR: {error.message}"
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": msg
        })
    
    path, error = g.generate_form(
        transaction=transaction,
        extension=request.extension,
        form=form
    )
    if error:
        msg = f"REPORT GENERATION ERROR: {error.message}"
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": msg
        })
    
    if request.extension == "pdf":
        media_type = "application/pdf"
    elif request.extension == "png":
        media_type = "image/png"
    elif request.extension in ["jpg", "jpeg"]:
        media_type = "image/jpeg"
    else:
        media_type = "application/octet-stream"

    filename = os.path.basename(path)
    return FileResponse(
        path=path,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )