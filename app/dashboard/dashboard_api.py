from fastapi import APIRouter, HTTPException, Depends

from app.dataclass import ItemInventory, Inventory
import app.dependency as d
import app.dashboard.dashboard as dd
import app.dashboard.dashboard_serializer as ds

router = APIRouter()

@router.get("/inventory/")
async def get_inventory(logged: int = Depends(d.get_current_user)):
    inventory, error = dd.inventory(logged=logged)
    if error:
        raise HTTPException(status_code=400, detail={
            "subject": error.subject,
            "message": error.message
        })
    return {"inventory": ds.serialize_inventory(inventory)}