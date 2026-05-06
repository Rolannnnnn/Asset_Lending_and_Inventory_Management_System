# False if account does not exist or do not have proper authorization
def auth_account(logged: int, or_mode: bool, conn, cur, role_needed: list[str] = None, id_needed: int = None) -> bool:
    cur.execute("SELECT * FROM accounts WHERE id = %s AND is_active = TRUE", (logged,))
    result = cur.fetchone()

    if not result:
        return False

    prog = 0
    to_check = 0
    
    for r in [role_needed, id_needed]:
        if r is not None:
            to_check = to_check + 1

    if role_needed:
        if result["role"] in role_needed:
            prog = prog + 1
    
    if id_needed:
        if id_needed == logged:
            prog = prog + 1
    
    if or_mode:
        if prog >= 1:
            return True
    else:
        if prog == to_check:
            return True
    return False