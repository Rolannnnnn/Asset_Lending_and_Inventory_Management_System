from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os, json
from dotenv import load_dotenv

from app.transaction.transaction_api import router as transaction_router
from app.account.account_api import router as account_router
from app.student.student_api import router as student_router
from app.item.item_api import router as item_router
from app.notification.notification_api import router as notification_router
from app.course.course_api import router as course_router
from app.dashboard.dashboard_api import router as dashboard_router

app = FastAPI()
load_dotenv()

ip = os.getenv("HOST")
front_port = os.getenv("API_PORT")

if not os.path.exists("item_images"):
    os.makedirs("item_images")

origins = [
    f"http://localhost:{front_port}",
    f"http://{ip}:{front_port}"
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
app.include_router(course_router, prefix="/courses", tags=["courses"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])

@app.get("/")
async def root():
    return {"message": "Hello, FastAPI!"}