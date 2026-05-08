from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os, json

from app.transaction.transaction_api import router as transaction_router
from app.account.account_api import router as account_router
from app.student.student_api import router as student_router

app = FastAPI()

# Get the absolute path to the DB_CONFIG.json file
config_path = os.path.join(os.path.dirname(__file__),'frontend\\src\\tool_modules\\FETCH_IP.json')

# Open the file with the absolute path
with open(config_path) as f:
    config = json.load(f)
    ip = config["ip"]
    port = config["port"]


origins = [
    "http://localhost:6767",
     f"{ip}:6767"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(origins)

app.include_router(transaction_router, prefix="/transactions", tags=["transactions"])
app.include_router(account_router, prefix="/accounts", tags=["accounts"])
app.include_router(student_router, prefix="/students", tags=["students"])

@app.get("/")
async def root():
    return {"message": "Hello, FastAPI!"}