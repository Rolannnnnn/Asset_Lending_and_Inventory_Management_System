from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional

import app.dependency as d
import app.item.item as ii
import app.item.item_serializer as iis
import app.item.item_model as iim
import app.item.item_image as iii
import app.item.item_stock as iistock
import app.item.item_import as iiimport

router = APIRouter()

@router.post("/import/")
async def import_api(file: UploadFile = File(...), item_id: int = Form(...), logged: int = Depends(d.get_current_user)):
    file_byte = None

    if file:
        content = await file.read()
        file_byte = content
    
    if file_byte is None:
        raise HTTPException(status_code=400, detail={
            "subject": "No Attachment",
            "message": "There is no attachment read. Please ensure that the file is properly attached before proceeding."
        })
    
    results, error = iiimport.check_and_save(logged=logged, file_byte=file_byte, item_id=item_id)
    if error:
        new_message = "FILE ERROR: " + error.message
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": new_message
        })
    import_file, cols = results
    
    full_import, error = iiimport.import_stock(import_file=import_file, cols=cols)
    if error:
        new_message = "DATABASE ERROR: " + error.message
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": new_message
        })
    
    return {"import": iis.serialize_full_import(full_import)}

@router.post("/add_item/")
async def add_item_api(name: str = Form(...), description: str = Form(...), file: Optional[UploadFile] = File(None), logged: int = Depends(d.get_current_user)):
    file_byte = None

    if file:
        content = await file.read()
        file_byte = content
    
    item, error = ii.add_item(
        logged=logged,
        name=name,
        description=description,
        file_bytes=file_byte
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"item": iis.serialize_item(item)}

@router.post("/edit_detail_item/")
async def edit_detail_item_api(request: iim.EditDetailItem, logged: int = Depends(d.get_current_user)):
    item, error = ii.edit_item_details(
        logged=logged,
        item_id=request.item_id,
        name=request.name,
        description=request.description
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"item": iis.serialize_item(item)}

@router.post("/edit_status_item/")
async def edit_status_item_api(request: iim.EditStatusItem, logged: int = Depends(d.get_current_user)):
    item, error = ii.edit_item_status(
        logged=logged,
        item_id=request.item_id,
        to_active=request.to_active
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"item": iis.serialize_item(item)}

@router.post("/add_attachment/")
async def add_attachment_api(item_id: int = Form(...), file: UploadFile = File(...), logged: int = Depends(d.get_current_user)):
    file_byte = None
    if file:
        content = await file.read()
        file_byte = content
    if file_byte is None:
        raise HTTPException(status_code=400, detail={
            "subject": "No Attachment",
            "message": "There is no attachment read. Please ensure that the file is properly attached before proceeding."
        })
    
    item, error = iii.attach_image(
        logged=logged,
        file_bytes=file_byte,
        item_id=item_id
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"item": iis.serialize_item(item)}

@router.post("/edit_attachment/")
async def edit_attachment_api(item_id: int = Form(...), file: UploadFile = File(...), logged: int = Depends(d.get_current_user)):
    file_byte = None
    if file:
        content = await file.read()
        file_byte = content
    if file_byte is None:
        raise HTTPException(status_code=400, detail={
            "subject": "No Attachment",
            "message": "There is no attachment read. Please ensure that the file is properly attached before proceeding."
        })
    
    item, error = iii.edit_attach(
        logged=logged,
        file_bytes=file_byte,
        item_id=item_id
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"item": iis.serialize_item(item)}

@router.post("/delete_attachment/")
async def delete_attachment_api(request: iim.RemoveAttachment, logged: int = Depends(d.get_current_user)):
    item, error = iii.remove_attach(logged=logged, item_id=request.item_id)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"item": iis.serialize_item(item)}

@router.post("/add_stock/")
async def add_stock_api(request: iim.AddStock, logged: int = Depends(d.get_current_user)):
    stock, error = iistock.add_stock(
        logged=logged,
        item_id=request.item_id,
        serial_number=request.serial_number,
        status=request.status,
        condition=request.condition
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"stock": iis.serialize_stock(stock)}

@router.post("/edit_stock/")
async def edit_stock_api(request: iim.EditStock, logged: int = Depends(d.get_current_user)):
    stock, error = iistock.edit_stock(
        logged=logged,
        item_id=request.item_id,
        serial_number=request.serial_number,
        status=request.status,
        condition=request.condition
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    
    return {"stock": iis.serialize_stock(stock)}

@router.get("/get_all/")
async def get_all_api(logged: int = Depends(d.get_current_user)):
    items, error = ii.get_all(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"items": [iis.serialize_item_with_image(item) for item in items]}

@router.get("/get_all_full/")
async def get_all_full(logged: int = Depends(d.get_current_user)):
    items, error = ii.get_all_full(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"items": [iis.serialize_full_item(item) for item in items]}