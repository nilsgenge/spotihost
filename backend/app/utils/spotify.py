import os
import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models import SpotifyToken

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

def get_valid_spotify_token(db: Session) -> str:
    """
    Retrieves a valid access token.
    If expired, it automatically refreshes it.
    Returns the access token string.
    """
    token_record = db.query(SpotifyToken).first()
    
    if not token_record:
        raise Exception("No Spotify token found. Please login first.")

    now = datetime.now()
    if token_record.expires_at.replace(tzinfo=None) <= now + timedelta(seconds=60):
        print("Token expired. Refreshing...")
        
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": token_record.refresh_token,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }
        
        response = requests.post("https://accounts.spotify.com/api/token", data=payload)
        
        if response.status_code != 200:
            raise Exception(f"Failed to refresh token: {response.text}")
            
        data = response.json()
        
        token_record.access_token = data["access_token"]
        if "refresh_token" in data:
            token_record.refresh_token = data["refresh_token"]
            
        token_record.expires_at = datetime.now() + timedelta(seconds=data.get("expires_in", 3600)) # type: ignore
        db.commit()
        print("Token refreshed successfully.")
        
        return token_record.access_token
    
    return token_record.access_token # type: ignore