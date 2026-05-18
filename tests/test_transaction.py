import app.item.item_import as iiimport

path = "C:\\Users\\Rolan\\ProgProjs\\digital_inventory_system\\test_file\\test_stocks.xlsx"

with open(path, "rb") as f:
    file_bytes = f.read()

    results, error = iiimport.check_and_save(logged=1, file_byte=file_bytes, item_id=1)
    if error:
        new_message = "FILE ERROR: " + error.message
        print(new_message)
    if results:
        import_file, cols = results
    
        full_import, error = iiimport.import_stock(import_file=import_file, update=True, cols=cols)
        if error:
            new_message = "DATABASE ERROR: " + error.message
            print(new_message)
        
        if full_import:
            print(full_import)