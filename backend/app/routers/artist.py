from fastapi import APIRouter, HTTPException, Depends
import requests
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models import Album, Artist, Listen, Track, track_artists, track_album, album_artists
from app.schemas import AdvancedArtist, ArtistCreate, ArtistLink, ArtistOut, SimpleAlbum, SimpleTrack
from app.database import get_db
from app.utils.spotify import enrich_artist_images, get_valid_spotify_token
from app.ingestion import create_or_get_artist, get_image_qualities

router = APIRouter(prefix="/artist", tags=["artist"])

def get_smallest_image(images: list) -> str:
    if not images:
        return ""
    try:
        return sorted(images, key=lambda x: x.get('height', 9999))[0]['url']
    except:
        return ""

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
        .options(
            joinedload(Artist.tracks), 
            joinedload(Artist.albums).joinedload(Album.artists)
        )
        .filter(Artist.spotify_id == spotify_id)
        .first()
    )

    # If artist not found, try to fetch from Spotify API
    if not artist:
        try:
            token = get_valid_spotify_token(db)
            if not token:
                raise HTTPException(status_code=404, detail="Artist not found and unable to fetch from Spotify")
            
            artist = fetch_and_ingest_artist(spotify_id, db, token)
            
            # Re-query with proper joins after ingestion
            artist = (
                db.query(Artist)
                .options(
                    joinedload(Artist.tracks), 
                    joinedload(Artist.albums).joinedload(Album.artists)
                )
                .filter(Artist.spotify_id == spotify_id)
                .first()
            )
            
            if not artist:
                raise HTTPException(status_code=404, detail="Artist not found after ingestion")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Artist not found: {str(e)}")

    enrich_artist_images(artist, db)
    
    listen_count: int = (
        db.query(func.count(Listen.listen_id))
        .join(Track, Track.track_id == Listen.track_id)
        .join(track_artists)
        .filter(track_artists.c.artist_id == artist.artist_id)
        .scalar()
        or 0
    )

    track_stats = (
        db.query(Track.spotify_id, func.count(Listen.listen_id))
        .join(Listen, Track.track_id == Listen.track_id)
        .join(track_artists, track_artists.c.track_id == Track.track_id)
        .filter(track_artists.c.artist_id == artist.artist_id)
        .group_by(Track.spotify_id)
        .all()
    )
    track_listen_map = {sp_id: count for sp_id, count in track_stats}

    album_stats = (
        db.query(Album.spotify_id, func.count(Listen.listen_id))
        .join(track_album, track_album.c.album_id == Album.album_id)
        .join(Track, Track.track_id == track_album.c.track_id)
        .join(Listen, Listen.track_id == Track.track_id)
        .join(album_artists, album_artists.c.album_id == Album.album_id)
        .filter(album_artists.c.artist_id == artist.artist_id)
        .group_by(Album.spotify_id)
        .all()
    )
    album_listen_map = {sp_id: count for sp_id, count in album_stats}

    followers = 0
    popularity = 0
    genres = []
    
    try:
        token = get_valid_spotify_token(db)
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            
            artist_resp = requests.get(f"https://api.spotify.com/v1/artists/{spotify_id}", headers=headers, timeout=5)
            if artist_resp.status_code == 200:
                data = artist_resp.json()
                followers = data.get("followers", {}).get("total", 0)
                popularity = data.get("popularity", 0)
                genres = data.get("genres", [])

    except Exception:
        pass

    final_albums: list[SimpleAlbum] = []
    for album in artist.albums:
        count = album_listen_map.get(album.spotify_id, 0)
        
        final_albums.append(
            SimpleAlbum(
                spotify_id=album.spotify_id,
                name=album.name,
                cover_url=album.image_url_small or "",
                listen_count=count,
                artists=[
                    ArtistLink(name=a.name, url=f"/artist/{a.spotify_id}")
                    for a in album.artists
                ],
                album_type=album.album_type or "",
            )
        )

    # Build Tracks List
    final_tracks: list[SimpleTrack] = []
    for track in artist.tracks:
        count = track_listen_map.get(track.spotify_id, 0)
        
        cover = track.image_url_small
        if not cover and track.albums:
            cover = track.albums[0].image_url_small or ""

        final_tracks.append(
            SimpleTrack(
                spotify_id=track.spotify_id,
                name=track.name,
                cover_url=cover or "",
                listen_count=count,
                artists=[
                    ArtistLink(name=a.name, url=f"/artist/{a.spotify_id}")
                    for a in track.artists
                ]
            )
        )

    final_albums.sort(key=lambda x: x.listen_count, reverse=True)
    final_tracks.sort(key=lambda x: x.listen_count, reverse=True)

    return AdvancedArtist(
        spotify_id=artist.spotify_id,
        name=artist.name,
        image_url=artist.image_url_medium or "",
        followers=followers,
        genres=genres,
        popularity=popularity,
        listen_count=listen_count,
        albums=final_albums,
        tracks=final_tracks,
    )




def fetch_and_ingest_artist(spotify_id: str, db: Session, token: str):
    """Fetch artist from Spotify API and ingest it into database."""
    url = f"https://api.spotify.com/v1/artists/{spotify_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, timeout=5)
    
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="Artist not found on Spotify")
    
    data = response.json()
    
    imgs = data.get("images", [])
    img_sma, img_med, img_lrg = get_image_qualities(imgs)
    
    artist, _ = create_or_get_artist(
        db=db,
        spotify_id=spotify_id,
        name=data.get("name"),
        image_url_small=img_sma,
        image_url_medium=img_med,
        image_url_large=img_lrg,
    )
    
    db.commit()
    return artist