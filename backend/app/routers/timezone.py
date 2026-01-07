from fastapi import APIRouter
from dotenv import load_dotenv
import os

router = APIRouter()

load_dotenv()

@router.get("/timezone")
def get_timezone():
    """Returns the configured timezone for the application."""
    return {"timezone": os.getenv("APP_TIME_ZONE", "UTC")}