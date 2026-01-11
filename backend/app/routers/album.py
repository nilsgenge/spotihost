from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models import Album, Listen, Track, track_album
from app.schemas import AdvancedAlbum, AlbumCreate, AlbumOut, ArtistLink, SimpleArtist, SimpleTrack
from app.database import get_db
from app.utils.spotify import enrich_artist_images

router = APIRouter(prefix="/album", tags=["album"])

@router.post("/", response_model=AlbumOut)
def create_album(album: AlbumCreate, db: Session = Depends(get_db)):
    db_album = Album(**album.dict())
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

@router.get("/{spotify_id}", response_model=AdvancedAlbum)
def get_album_details(spotify_id: str, db: Session = Depends(get_db)):
    album = (
        db.query(Album)
        .options(
            joinedload(Album.artists),
            joinedload(Album.tracks).joinedload(Track.artists)
        )
        .filter(Album.spotify_id == spotify_id)
        .first()
    )

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")

    album_listen_count: int = (
        db.query(func.count(Listen.listen_id))
        .join(Track, Track.track_id == Listen.track_id)
        .join(track_album)
        .filter(track_album.c.album_id == album.album_id)
        .scalar()
        or 0
    )

    artists: list[SimpleArtist] = []
    for a in album.artists:
        enrich_artist_images(a, db)

        artists.append(
            SimpleArtist(
                artist_id=a.artist_id,
                spotify_id=a.spotify_id,
                name=a.name,
                image_url=a.image_url_small or "",
                listen_count=0,
            )
        )

    tracks: list[SimpleTrack] = []
    for track in album.tracks:
        track_listen_count: int = (
            db.query(func.count(Listen.listen_id))
            .filter(Listen.track_id == track.track_id)
            .scalar()
            or 0
        )

        track_artists_links: list[ArtistLink] = [
            ArtistLink(name=a.name, url=f"/artist/{a.spotify_id}")
            for a in track.artists
        ]

        tracks.append(
            SimpleTrack(
                track_id=track.track_id,
                spotify_id=track.spotify_id,
                name=track.name,
                cover_url=track.image_url_small or "",
                listen_count=track_listen_count,
                artists=track_artists_links,
            )
        )

    return AdvancedAlbum(
        name=album.name,
        artists=artists,
        release_date=album.release_date.isoformat() if album.release_date else "", # type: ignore
        total_tracks=album.total_tracks,
        image_url=album.image_url_medium or "",
        popularity=0,
        listen_count=album_listen_count,
        tracks=tracks,
    )
