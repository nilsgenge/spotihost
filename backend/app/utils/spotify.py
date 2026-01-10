import os
import requests
from app.models import Artist, SpotifyToken
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

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
        
    return token_record.access_token # type: ignore

def enrich_artist_images(artist: Artist, db: Session):
    """
    Checks if artist has images. If not, fetches from Spotify, updates DB.
    """
    if getattr(artist, "image_url_small", None):
        return

    try:
        token = get_valid_spotify_token(db)
        if token is None:
            print("No Spotify token available, skipping image fetch.")
            return

        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"https://api.spotify.com/v1/artists/{artist.spotify_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            images = data.get("images", [])
            
            if images:
                images.sort(key=lambda x: x.get('height', 0), reverse=True)
                
                large_url = images[0]['url'] if len(images) > 0 else None
                medium_url = images[len(images)//2]['url'] if len(images) > 1 else None
                small_url = images[-1]['url'] if len(images) > 0 else None

                setattr(artist, "image_url_large", large_url)
                setattr(artist, "image_url_medium", medium_url)
                setattr(artist, "image_url_small", small_url)
                
                db.commit()
                print(f"Fetched and saved images for artist: {artist.name}")
        else:
            print(f"Failed to fetch artist {artist.spotify_id}: {response.status_code}")

    except Exception as e:
        print(f"Error fetching artist images: {e}")
        pass