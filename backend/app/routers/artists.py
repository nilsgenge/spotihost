from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Artist
from app.schemas import ArtistCreate, ArtistOut
from app.database import get_db

router = APIRouter(prefix="/artists", tags=["artists"])

@router.post("/", response_model=ArtistOut)
def create_artist(artist: ArtistCreate, db: Session = Depends(get_db)):
    """Create a new artist."""
    try:
        db_artist = Artist(
            spotify_id=artist.spotify_id,
            name=artist.name,
            popularity=getattr(artist, "popularity", 0),
            followers=getattr(artist, "followers", 0),
            image_url=getattr(artist, "image_url", None)
        )
        db.add(db_artist)
        db.commit()
        db.refresh(db_artist)
        return db_artist
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[ArtistOut])
def get_artists(db: Session = Depends(get_db)):
    """Get all artists."""
    try:
        artists = db.query(Artist).all()
        return artists
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{artist_id}", response_model=ArtistOut)
def get_artist(artist_id: int, db: Session = Depends(get_db)):
    """Get artist by ID."""
    try:
        artist = db.query(Artist).filter(Artist.artist_id == artist_id).first()
        if artist is None:
            raise HTTPException(status_code=404, detail="Artist not found")
        return artist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

