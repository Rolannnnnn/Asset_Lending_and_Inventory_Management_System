from fastapi import APIRouter, HTTPException, Depends

import app.dependency as d

import app.notification.notification as n
import app.notification.notification_serializer as ns
import app.notification.notification_model as nm

router = APIRouter()

@router.get("/get/")
async def get_all_via_account_id(logged: int = Depends(d.get_current_user)):
    parseds, error = n.get_all_via_account_id(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"notifications": [ns.serialize_parsed(notif) for notif in parseds]}

@router.post("/read_all/")
async def read_all_api(logged: int = Depends(d.get_current_user)):
    _, error = n.read_all(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return None

@router.post("/read_one/")
async def read_one_api(request: nm.ReadOne, logged: int = Depends(d.get_current_user)):
    notif, error = n.read_unread_one(
        logged=logged,
        notification_id=request.notification_id,
        to_read=True
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"notification": ns.serialize_notif(notif)}

@router.post("/unread_one/")
async def unread_one_api(request: nm.UnreadOne, logged: int = Depends(d.get_current_user)):
    notif, error = n.read_unread_one(
        logged=logged,
        notification_id=request.notification_id,
        to_read=False
    )
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"notification": ns.serialize_notif(notif)}