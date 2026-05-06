import app.transaction.transaction as t

ts, error = t.get_all_via_account_id(1)
print(ts)