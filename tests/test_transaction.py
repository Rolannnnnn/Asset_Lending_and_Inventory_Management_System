import app.transaction.transaction as t

ts, error = t.get_detailed_transaction(1, 3)
print(ts)