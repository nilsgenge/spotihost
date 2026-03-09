from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import requests
import os
import threading
import logging

from app.database import get_db
from app.models import SpotifyToken
from app.utils.spotify import get_valid_spotify_token
from app.ingestion import ingest_recent_listens

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:5173/callback")

SCOPES = "user-read-recently-played user-read-currently-playing user-read-playback-state user-library-read"

class CodeRequest(BaseModel):
    code: str

@router.get("/login")
def login():
    auth_url = (
        "https://accounts.spotify.com/authorize?"
        f"client_id={CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={SCOPES}"
    )
    
    
    return {"auth_url": auth_url}

@router.post("/logout")
def logout(db: Session = Depends(get_db)):
    """Deletes the stored Spotify token."""
    try:
        db.query(SpotifyToken).delete()
        db.commit()
        return {"message": "Logged out successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to logout")
    


@router.post("/callback")
def callback(request: CodeRequest, db: Session = Depends(get_db)):
    """
    Frontend sends the 'code' here.
    Backend swaps 'code' for 'access_token' and 'refresh_token'.
    """
    payload = {
        "grant_type": "authorization_code",
        "code": request.code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }

    response = requests.post("https://accounts.spotify.com/api/token", data=payload)
    data = response.json()

    if "error" in data:
        raise HTTPException(status_code=400, detail="Failed to get token from Spotify")

    expires_at = datetime.now() + timedelta(seconds=data.get("expires_in", 3600))

    existing_token = db.query(SpotifyToken).first()

    if existing_token:
        existing_token.access_token = data["access_token"]
        existing_token.refresh_token = data["refresh_token"]
        existing_token.expires_at = expires_at # type: ignore
    else:
        new_token = SpotifyToken(
            access_token=data["access_token"],
            refresh_token=data["refresh_token"],
            expires_at=expires_at
        )
        db.add(new_token)

    db.commit()

    # Trigger first ingestion so user does not have an empty dashboard
    thread = threading.Thread(target=ingest_recent_listens, daemon=True)
    thread.start()

    return {"message": "Authentication successful"}

@router.get("/me")
def get_user_profile(db: Session = Depends(get_db)):
    """
    Check if user is authenticated and fetches their Profile.
    - Checks for valid token in DB.
    - Refreshes token if expired.
    - Fetches Profile Data (Name, Avatar) from Spotify.
    """
    try:
        token = get_valid_spotify_token(db)
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("https://api.spotify.com/v1/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "name": data.get("display_name", "User"),
                "image": data.get("images", [{}])[0].get("url"),
                "id": data.get("id")
            }
        
        raise HTTPException(status_code=401, detail="Invalid Token")
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="User not authenticated")
    