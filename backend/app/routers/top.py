from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from app.database import get_db
from datetime import datetime
from app.models import (
    Album, 
    Listen, 
    Artist, 
    Track, 
    track_artists, 
    track_album, 
    album_artists
)
from app.utils.spotify import enrich_artist_images 

router = APIRouter(prefix="/top", tags=["top"])

PLACEHOLDER_IMAGE_URL = "https://dummyimage.com/100/fff/0011ff.png&text=Image+Not+Found"

@router.get("/top-artists")
def get_top_artists(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    limit: int = Query(10, description="Number of top artists to return"),
    db: Session = Depends(get_db)
):
    """Get the top artists within a time range."""
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        top_artists_data = (
            db.query(
                Artist, 
                func.count(Listen.listen_id).label("listen_count")
            )
            .join(track_artists, Artist.artist_id == track_artists.c.artist_id)
            .join(Track, Track.track_id == track_artists.c.track_id)
            .join(Listen, Listen.track_id == Track.track_id)
            .filter(Listen.played_at.between(start_datetime, end_datetime))
            .group_by(Artist)
            .order_by(func.count(Listen.listen_id).desc())
            .limit(limit)
            .all()
        )
    
        result = []
        for artist, listen_count in top_artists_data:
            
            enrich_artist_images(artist, db)

            result.append({
                "artist_id": artist.artist_id,
                "name": artist.name,
                "image_url": artist.image_url_small or "YOUR_PLACEHOLDER_IMAGE_URL_HERE",
                "listen_count": listen_count
            })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-tracks")
def get_top_tracks(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    limit: int = Query(10, description="Number of top tracks to return"),
    db: Session = Depends(get_db)
):
    """Get the top tracks within a time range."""
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        top_tracks = (
            db.query(
                Track.track_id,
                Track.name,
                Track.image_url_small.label("small"),
                func.count(distinct(Listen.listen_id)).label("listen_count"),
                func.string_agg(distinct(Artist.name), ", ").label("artist_name")
            )
            .join(track_artists, Track.track_id == track_artists.c.track_id)
            .join(Artist, Artist.artist_id == track_artists.c.artist_id)
            .join(Listen, Listen.track_id == Track.track_id)
            .filter(Listen.played_at.between(start_datetime, end_datetime))
            .group_by(Track.track_id, Track.name, Track.image_url_small)
            .order_by(func.count(distinct(Listen.listen_id)).desc())
            .limit(limit)
            .all()
        )

        result = [
            {
                "track_id": track.track_id,
                "name": track.name,
                "cover_url": track.small or "YOUR_PLACEHOLDER_IMAGE_URL_HERE",
                "artist_name": track.artist_name or "Unknown Artist",
                "listen_count": track.listen_count
            }
            for track in top_tracks
        ]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-albums")
def get_top_albums(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    limit: int = Query(10, description="Number of top albums to return"),
    db: Session = Depends(get_db)
):
    """Get the top albums within a time range."""
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        top_albums = (
            db.query(
                Album.album_id,
                Album.name,
                Album.image_url_small.label("small") , 
                func.count(distinct(Listen.listen_id)).label("listen_count"),
                func.string_agg(distinct(Artist.name), ", ").label("artist_name")
            )
            .join(album_artists, Album.album_id == album_artists.c.album_id)
            .join(Artist, Artist.artist_id == album_artists.c.artist_id)
            .join(track_album, Album.album_id == track_album.c.album_id)
            .join(Listen, Listen.track_id == track_album.c.track_id)
            .filter(Listen.played_at.between(start_datetime, end_datetime))
            .group_by(Album.album_id, Album.name, Album.image_url_small)
            .order_by(func.count(distinct(Listen.listen_id)).desc())
            .limit(limit)
            .all()
        )

        result = [
            {
                "album_id": album.album_id,
                "name": album.name,
                "cover_url": album.small or "YOUR_PLACEHOLDER_IMAGE_URL_HERE",
                "artist_name": album.artist_name or "Unknown Artist",
                "listen_count": album.listen_count
            }
            for album in top_albums
        ]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))