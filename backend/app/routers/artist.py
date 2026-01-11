from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models import Artist, Listen, Track, track_artists
from app.schemas import AdvancedArtist, ArtistCreate, ArtistOut
from app.database import get_db
from app.utils.spotify import enrich_artist_images

router = APIRouter(prefix="/artist", tags=["artist"])

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

@router.get("/{spotify_id}", response_model=AdvancedArtist)
def get_artist_details(spotify_id: str, db: Session = Depends(get_db)):
    artist = (
        db.query(Artist)
        .options(joinedload(Artist.tracks))
        .filter(Artist.spotify_id == spotify_id)
        .first()
    )

    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    enrich_artist_images(artist, db)
    
    listen_count: int = (
        db.query(func.count(Listen.listen_id))
        .join(Track, Track.track_id == Listen.track_id)
        .join(track_artists)
        .filter(track_artists.c.artist_id == artist.artist_id)
        .scalar()
        or 0
    )

    return AdvancedArtist(
        spotify_id=artist.spotify_id,
        name=artist.name,
        image_url=artist.image_url_large or "",
        followers=0,
        genres=[],
        popularity=0,
        listen_count=listen_count,
    )
