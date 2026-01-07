import logging
from fastapi import APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import requests
from app.database import get_db
from app.utils.spotify import get_valid_spotify_token

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/currently-playing")
def get_currently_playing(db: Session = Depends(get_db)):
    """
    Removed manual `db = SessionLocal()` creation.
    FastAPI now handles opening and closing the session automatically.
    """
    try:
        token = get_valid_spotify_token(db)
        if not token:
            raise HTTPException(status_code=500, detail="Server configuration error: Token missing")

        url = "https://api.spotify.com/v1/me/player" 
        headers = {"Authorization": f"Bearer {token}"}
    
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            logger.info(f"Full State fetched. Device: {data.get('device', {}).get('name')}, Shuffle: {data.get('shuffle_state')}")
            return data

        elif response.status_code == 204:
            return {
                "is_playing": False,
                "item": None,
                "device": {},
                "shuffle_state": False,
                "repeat_state": "off"
            }
        
        else:
            logger.error(f"Error: {response.status_code}")
            return {"error": f"Failed - StatusCode: {response.status_code}"}

    except requests.exceptions.RequestException as e:
        logger.exception("Network error")
        raise HTTPException(status_code=503, detail="Spotify API unreachable")

