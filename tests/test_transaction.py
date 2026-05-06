import app.transaction.transaction as t

ts, error = t.transfer_to_pms(1, 3, ['AAA'], ['AVAILABLE'])
print(ts)