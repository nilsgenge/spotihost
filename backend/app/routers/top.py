from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
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
from app.schemas import ArtistLink, SimpleAlbum, SimpleArtist, SimpleTrack 

router = APIRouter(prefix="/top", tags=["top"])

PLACEHOLDER_IMAGE_URL = "https://dummyimage.com/100/fff/0011ff.png&text=Image+Not+Found"



@router.get("/top-artists", response_model=List[SimpleArtist])
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

            result.append(
                SimpleArtist(
                    artist_id=artist.artist_id,
                    spotify_id=artist.spotify_id,
                    name=artist.name,
                    image_url=artist.image_url_small or "YOUR_PLACEHOLDER_IMAGE_URL_HERE",
                    listen_count=listen_count
                )
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-tracks", response_model=List[SimpleTrack])
def get_top_tracks(
    start: str = Query(...),
    end: str = Query(...),
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get the top tracks within a time range."""
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        top_tracks_data = (
            db.query(Track, func.count(distinct(Listen.listen_id)).label("listen_count"))
            .options(joinedload(Track.artists))
            .join(track_artists, Track.track_id == track_artists.c.track_id)
            .join(Listen, Listen.track_id == Track.track_id)
            .filter(Listen.played_at.between(start_datetime, end_datetime))
            .group_by(Track.track_id)
            .order_by(func.count(distinct(Listen.listen_id)).desc())
            .limit(limit)
            .all()
        )

        result = []
        for track, listen_count in top_tracks_data:
            
            artist_links = [
                ArtistLink(
                    name=artist.name, 
                    url=f"/artist/{artist.spotify_id}"
                ) 
                for artist in track.artists
            ]

            result.append(
                SimpleTrack(
                    track_id=track.track_id,
                    spotify_id=track.spotify_id,
                    name=track.name,
                    cover_url=track.image_url_small,
                    listen_count=listen_count,
                    artists=artist_links
                )
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-albums", response_model=List[SimpleAlbum])
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
                Album, 
                func.count(distinct(Listen.listen_id)).label("listen_count")
            )
            .options(joinedload(Album.artists))
            .join(track_album, Album.album_id == track_album.c.album_id)
            .join(Listen, Listen.track_id == track_album.c.track_id)
            .filter(Listen.played_at.between(start_datetime, end_datetime))
            .group_by(Album.album_id)
            .order_by(func.count(distinct(Listen.listen_id)).desc())
            .limit(limit)
            .all()
        )

        result = []
        for album, listen_count in top_albums:
            artists_info = [
                ArtistLink(
                    name=artist.name, 
                    url=f"/artist/{artist.spotify_id}"
                )
                for artist in album.artists
            ]

            result.append(
                SimpleAlbum(
                    album_id=album.album_id,
                    spotify_id=album.spotify_id,
                    name=album.name,
                    cover_url=album.image_url_small or "YOUR_PLACEHOLDER_IMAGE_URL_HERE",
                    listen_count=listen_count,
                    artists=artists_info
                )
            )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))