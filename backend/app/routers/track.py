from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models import Album, Listen, Track, track_album, track_artists
from app.schemas import AdvancedTrack, ArtistLink, SimpleAlbum, SimpleArtist, TrackCreate, TrackOut
from app.database import get_db
from app.utils.spotify import enrich_artist_images

router = APIRouter(prefix="/track", tags=["track"])

@router.post("/", response_model=TrackOut)
def create_track(track: TrackCreate, db: Session = Depends(get_db)):
    """Create a new track."""
    try:
        db_track = Track(spotify_id=track.spotify_id, name=track.name)
        db.add(db_track)
        db.commit()
        db.refresh(db_track)
        return {"track_id": db_track.track_id, "message": "Track created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{spotify_id}", response_model=AdvancedTrack)
def get_track_details(spotify_id: str, db: Session = Depends(get_db)):
    local_track = (
        db.query(Track)
        .options(
            joinedload(Track.artists),
            joinedload(Track.albums).joinedload(Album.artists),
        )
        .filter(Track.spotify_id == spotify_id)
        .first()
    )

    if not local_track:
        raise HTTPException(status_code=404, detail="Track not found")

    track_listen_count: int = (
        db.query(func.count(Listen.listen_id))
        .filter(Listen.track_id == local_track.track_id)
        .scalar()
        or 0
    )

    artists: list[SimpleArtist] = []
    for artist in local_track.artists:
        enrich_artist_images(artist, db)
        artist_listens: int = (
            db.query(func.count(Listen.listen_id))
            .join(Track, Track.track_id == Listen.track_id)
            .join(track_artists)
            .filter(track_artists.c.artist_id == artist.artist_id)
            .scalar()
            or 0
        )

        artists.append(
            SimpleArtist(
                artist_id=artist.artist_id,
                spotify_id=artist.spotify_id,
                name=artist.name,
                image_url=artist.image_url_small or "",
                listen_count=artist_listens,
            )
        )

    albums: list[SimpleAlbum] = []
    for album in local_track.albums:
        album_listens: int = (
            db.query(func.count(Listen.listen_id))
            .join(Track, Track.track_id == Listen.track_id)
            .join(track_album)
            .filter(track_album.c.album_id == album.album_id)
            .scalar()
            or 0
        )

        album_artists = [
            ArtistLink(
                name=artist.name,
                url=f"/artist/{artist.spotify_id}",
            )
            for artist in album.artists
        ]

        albums.append(
            SimpleAlbum(
                album_id=album.album_id,
                spotify_id=album.spotify_id,
                name=album.name,
                cover_url=album.image_url_small or "",
                listen_count=album_listens,
                artists=album_artists,
            )
        )

    return AdvancedTrack(
        name=local_track.name,
        artists=artists,
        albums=albums,
        image_url=local_track.image_url_large
        or (albums[0].cover_url if albums else ""),
        duration_s=float(local_track.duration) if local_track.duration else 0.0,
        popularity=0,
        external_urls={
            "spotify": f"https://open.spotify.com/track/{local_track.spotify_id}"
        },
        listen_count=track_listen_count,
    )

