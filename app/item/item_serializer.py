from app.dataclass import Item, Stock, FullItem, ItemWithImage

def serialize_item(item: Item):
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "is_available": item.is_available,
        "image_uuid": item.image_uuid
    }

def serialize_stock(stock: Stock):
    return {
        "item_id": stock.item_id,
        "serial_number": stock.serial_number,
        "status": stock.status,
        "condition": stock.condition
    }

def serialize_item_with_image(item: ItemWithImage):
    return {
        "id": item.item.id,
        "name": item.item.name,
        "description": item.item.description,
        "is_available": item.item.is_available,
        "image_uuid": item.item.image_uuid,
        "image_path": item.image_path
    }