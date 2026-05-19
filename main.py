from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os, json

from app.transaction.transaction_api import router as transaction_router
from app.account.account_api import router as account_router
from app.student.student_api import router as student_router
from app.item.item_api import router as item_router
from app.notification.notification_api import router as notification_router

app = FastAPI()

# Get the absolute path to the DB_CONFIG.json file
config_path = os.path.join(os.path.dirname(__file__),'frontend\\src\\tool_modules\\FETCH_IP.json')

# Open the file with the absolute path
with open(config_path) as f:
    config = json.load(f)
    ip = config["ip"]
    port = config["port"]
    front_port = config["front_port"]

if not os.path.exists("item_images"):
    os.makedirs("item_images")

origins = [
    f"http://localhost:{front_port}",
    f"{ip}:{front_port}"
]

app.mount("/static", StaticFiles(directory="app/item/item_images"), name="static")
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
app.include_router(item_router, prefix="/items", tags=["items"])
app.include_router(notification_router, prefix="/notifications", tags=["notifications"])

@app.get("/")
async def root():
    return {"message": "Hello, FastAPI!"}