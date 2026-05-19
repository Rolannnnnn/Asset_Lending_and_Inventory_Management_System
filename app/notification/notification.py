# All functions here rely on other functions for validation and connection, except for viewing.

# SAS
# REQUEST_BORROW
# ACCEPT_BORROW (NO REQUEST_ISSUANCE)
# ACCEPT_ISSUANCE

# PMS
# REQUEST_ISSUANCE
# RETURNED

TRANSACTION_STATUS = ["REQUEST_BORROW", "ACCEPT_BORROW", "REQUEST_ISSUANCE", "ACCEPT_ISSUANCE", "TRANSFERRED_TO_STUDENT", "RETURNED", "TRANSFERRED_TO_PMS"]
DECLINED_STATUS = ["DECLINE_BORROW", "DECLINE_ISSUANCE"]

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

def request_borrow(transaction_id: int, conn, cur):
    cur.execute("""
        SELECT id FROM accounts WHERE role = ANY(%s) AND is_active = TRUE            
    """, (("SAS", "ADMIN"),))
    res = cur.fetchall()
    accounts_ids = [x["id"] for x in res]

    insert_query = """
        INSERT INTO notifications 
        (mode, account_id, transaction_id)
    """
    values = (
        "REQUEST_BORROW", account_id, transaction_id
        for accounts_id in accounts_ids 
    )

    execute_values(cur, insert_query, values)