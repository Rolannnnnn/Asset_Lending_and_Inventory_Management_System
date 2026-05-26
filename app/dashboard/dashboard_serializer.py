from app.dataclass import ItemInventory, Inventory

def serialize_item_inventory(item: ItemInventory):
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "is_available": item.is_available,
        "image_path": item.image_path,
        "total": item.total,
        "available": item.available,
        "borrowed": item.borrowed,
        "for_repair": item.for_repair,
        "decommissioned": item.decommissioned
    }

def serialize_inventory(inventory: Inventory):
    return {
        "overall_total": inventory.overall_total,
        "overall_available": inventory.overall_available,
        "overall_borrowed": inventory.overall_borrowed,
        "overall_for_repair": inventory.overall_for_repair,
        "overall_decommissioned": inventory.overall_decommissioned,
        "items": [serialize_item_inventory(i) for i in inventory.items]
    }