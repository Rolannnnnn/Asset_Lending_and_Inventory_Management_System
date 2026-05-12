from app.dataclass import Item, Stock, FullItem, ItemWithImage, FullImport

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