import app.transaction.transaction as t

ts, error = t.respond_issuance(1, 8, "ACCEPT")
print(ts)