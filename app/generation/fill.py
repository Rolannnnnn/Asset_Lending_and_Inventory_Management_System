from psycopg2.extras import RealDictCursor

from app.generation.dataclass import Sample

def fill_sample(transaction: RealDictCursor):
    print(transaction)
    requesting_personnel = None
    for e in transaction["events"]:
        if e["type"] == "REQUEST_BORROW":
            requesting_personnel = e["personnel_name"]
            break
    
    if requesting_personnel is None:
        return None
    
    return Sample(
        student_name=transaction["student_name"],
        request_borrow_personnel_name=requesting_personnel
    )