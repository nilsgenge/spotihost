from fastapi import APIRouter, HTTPException, Depends
import requests
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models import Album, Listen, Track, track_album, track_artists
from app.schemas import AdvancedAlbum, AlbumCreate, AlbumOut, ArtistLink, SimpleArtist, SimpleTrack
from app.database import get_db
from app.utils.spotify import enrich_artist_images, get_valid_spotify_token
from app.ingestion import create_or_get_artist, create_or_get_album, parse_date, get_image_qualities

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

    # If album not found, try to fetch from Spotify API
    if not album:
        try:
            token = get_valid_spotify_token(db)
            if not token:
                raise HTTPException(status_code=404, detail="Album not found and unable to fetch from Spotify")
            
            album = fetch_and_ingest_album(spotify_id, db, token)
            
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
                raise HTTPException(status_code=404, detail="Album not found after ingestion")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Album not found: {str(e)}")

    # album listens
    album_listen_count: int = (
        db.query(func.count(Listen.listen_id))
        .join(Track, Track.track_id == Listen.track_id)
        .join(track_album)
        .filter(track_album.c.album_id == album.album_id)
        .filter((Listen.skipped == False) | (Listen.skipped == None))
        .scalar()
        or 0
    )

    # track listens
    db_tracks_map = {t.spotify_id: t for t in album.tracks}
    
    db_track_ids = [t.track_id for t in album.tracks]
    track_listen_counts = (
        db.query(Listen.track_id, func.count(Listen.listen_id))
        .filter(Listen.track_id.in_(db_track_ids))
        .filter((Listen.skipped == False) | (Listen.skipped == None))
        .group_by(Listen.track_id)
        .all()
    )
    listen_count_map = {tid: count for tid, count in track_listen_counts}

    # artists listens
    artist_ids = [a.artist_id for a in album.artists]
    artist_listen_counts = (
        db.query(track_artists.c.artist_id, func.count(Listen.listen_id))
        .join(Track, track_artists.c.track_id == Track.track_id)
        .join(Listen, Track.track_id == Listen.track_id)
        .filter(track_artists.c.artist_id.in_(artist_ids))
        .filter((Listen.skipped == False) | (Listen.skipped == None))
        .group_by(track_artists.c.artist_id)
        .all()
    )
    artist_listen_count_map = {aid: count for aid, count in artist_listen_counts}

    artists: list[SimpleArtist] = []
    for a in album.artists:
        enrich_artist_images(a, db)

        artists.append(
            SimpleArtist(
                spotify_id=a.spotify_id,
                name=a.name,
                image_url=a.image_url_small or "",
                listen_count=artist_listen_count_map.get(a.artist_id, 0),
            )
        )

    popularity = 0
    final_tracks: list[SimpleTrack] = []

    # api data
    try:
        token = get_valid_spotify_token(db)
        if token:
            url = f"https://api.spotify.com/v1/albums/{spotify_id}"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(url, headers=headers, timeout=5)

            if response.status_code == 200:
                data = response.json()
                
                popularity = data.get("popularity", 0)
                
                sp_items = data.get("tracks", {}).get("items", [])

                for item in sp_items:
                    sp_id = item.get("id")
                    if not sp_id:
                        continue
                    
                    db_track = db_tracks_map.get(sp_id)
                    
                    if db_track:
                        count = listen_count_map.get(db_track.track_id, 0)
                    else:
                        count = 0
                    
                    track_artists_links = [
                        ArtistLink(name=a["name"], url=f"/artist/{a['id']}")
                        for a in item.get("artists", [])
                    ]

                    final_tracks.append(
                        SimpleTrack(
                            spotify_id=sp_id,
                            name=item["name"],
                            cover_url=album.image_url_small or "", 
                            listen_count=count,
                            artists=track_artists_links,
                        )
                    )

    except Exception:
        pass

    # api fallback
    if not final_tracks:
        for db_track in album.tracks:
            count = listen_count_map.get(db_track.track_id, 0)
            
            track_artists_links = [
                ArtistLink(name=a.name, url=f"/artist/{a.spotify_id}")
                for a in db_track.artists
            ]

            final_tracks.append(
                SimpleTrack(
                    spotify_id=db_track.spotify_id,
                    name=db_track.name,
                    cover_url=db_track.image_url_small or album.image_url_small or "",
                    listen_count=count,
                    artists=track_artists_links,
                )
            )

    return AdvancedAlbum(
        name=album.name,
        artists=artists,
        release_date=album.release_date.isoformat() if album.release_date else "", # type: ignore
        total_tracks=len(final_tracks),
        image_url=album.image_url_medium or "",
        popularity=popularity,
        listen_count=album_listen_count,
        tracks=final_tracks,
        album_type=album.album_type or "",
    )






def fetch_and_ingest_album(spotify_id: str, db: Session, token: str):
    """Fetch album from Spotify API and ingest it into database."""
    url = f"https://api.spotify.com/v1/albums/{spotify_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, timeout=5)
    
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="Album not found on Spotify")
    
    data = response.json()
    
    # Process album artists
    album_artist_ids = []
    for a in data.get("artists", []):
        artist_data = requests.get(
            f"https://api.spotify.com/v1/artists/{a['id']}", 
            headers=headers, 
            timeout=5
        ).json()
        
        a_imgs = artist_data.get("images", [])
        a_sma, a_med, a_lrg = get_image_qualities(a_imgs)
        
        artist, _ = create_or_get_artist(
            db=db,
            spotify_id=a["id"],
            name=a["name"],
            image_url_small=a_sma,
            image_url_medium=a_med,
            image_url_large=a_lrg,
        )
        album_artist_ids.append(a["id"])
    
    # Process album
    al_imgs = data.get("images", [])
    al_sma, al_med, al_lrg = get_image_qualities(al_imgs)
    rel_date = parse_date(data.get("release_date"), data.get("release_date_precision"))
    
    album, _ = create_or_get_album(
        db=db,
        spotify_id=spotify_id,
        name=data.get("name"),
        artist_ids=album_artist_ids,
        release_date=rel_date,
        release_date_precision=data.get("release_date_precision"),
        album_type=data.get("album_type"),
        total_tracks=data.get("total_tracks", 0),
        image_url_small=al_sma,
        image_url_medium=al_med,
        image_url_large=al_lrg,
    )
    
    db.commit()
    return album