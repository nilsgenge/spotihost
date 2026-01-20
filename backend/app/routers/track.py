from fastapi import APIRouter, HTTPException, Depends
import requests
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models import Album, Listen, Track, track_album, track_artists
from app.schemas import AdvancedTrack, ArtistLink, SimpleAlbum, SimpleArtist, TrackCreate, TrackOut
from app.database import get_db
from app.utils.spotify import enrich_artist_images, get_valid_spotify_token
from app.ingestion import create_or_get_artist, create_or_get_album, create_or_get_track, parse_date, get_image_qualities

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

    # fetch api
    if not local_track:
        try:
            token = get_valid_spotify_token(db)
            if not token:
                raise HTTPException(status_code=404, detail="Track not found and unable to fetch from Spotify")
            
            local_track = fetch_and_ingest_track(spotify_id, db, token)
            
            # Re-query with proper joins after ingestion
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
                raise HTTPException(status_code=404, detail="Track not found after ingestion")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Track not found: {str(e)}")

    # track listens
    track_listen_count: int = (
        db.query(func.count(Listen.listen_id))
        .filter(Listen.track_id == local_track.track_id)
        .scalar()
        or 0
    )

    # process artists
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
                spotify_id=artist.spotify_id,
                name=artist.name,
                image_url=artist.image_url_small or "",
                listen_count=artist_listens,
            )
        )

    popularity = 0
    is_explicit = False
    final_album: SimpleAlbum = None # type: ignore

    # api fetch
    try:
        token = get_valid_spotify_token(db)
        if token:
            url = f"https://api.spotify.com/v1/tracks/{spotify_id}"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(url, headers=headers, timeout=5)

            if response.status_code == 200:
                data = response.json()
                
                popularity = data.get("popularity", 0)
                is_explicit = data.get("explicit", False)
                
                sp_album_data = data.get("album")
                
                if sp_album_data:
                    db_album = next(
                        (a for a in local_track.albums if a.spotify_id == sp_album_data['id']), 
                        None
                    )

                    if db_album:
                        album_listen_count = (
                            db.query(func.count(Listen.listen_id))
                            .join(Track, Track.track_id == Listen.track_id)
                            .join(track_album)
                            .filter(track_album.c.album_id == db_album.album_id)
                            .scalar()
                            or 0
                        )

                        album_artists_links = [
                            ArtistLink(name=a["name"], url=f"/artist/{a['id']}")
                            for a in sp_album_data.get("artists", [])
                        ]

                        final_album = SimpleAlbum(
                            spotify_id=db_album.spotify_id,
                            name=db_album.name,
                            cover_url=db_album.image_url_small or "",
                            listen_count=album_listen_count,
                            artists=album_artists_links,
                            album_type=sp_album_data.get("album_type", ""),
                        )

    except Exception:
        pass

    # api fallback
    if not final_album:
        db_album = local_track.albums[0]
        
        album_listens: int = (
            db.query(func.count(Listen.listen_id))
            .join(Track, Track.track_id == Listen.track_id)
            .join(track_album)
            .filter(track_album.c.album_id == db_album.album_id)
            .scalar()
            or 0
        )

        album_artists = [
            ArtistLink(
                name=artist.name,
                url=f"/artist/{artist.spotify_id}",
            )
            for artist in db_album.artists
        ]

        final_album = SimpleAlbum(
            spotify_id=db_album.spotify_id,
            name=db_album.name,
            cover_url=db_album.image_url_small or "",
            listen_count=album_listens,
            artists=album_artists,
            album_type=db_album.album_type or "",
        )

    return AdvancedTrack(
        name=local_track.name,
        artists=artists,
        album=final_album,
        image_url=local_track.image_url_medium or final_album.cover_url,
        duration_s=float(local_track.duration) if local_track.duration else 0.0,
        popularity=popularity,
        listen_count=track_listen_count,
        explicit=is_explicit
    )




def fetch_and_ingest_track(spotify_id: str, db: Session, token: str):
    """Fetch track from Spotify API and ingest it into database."""
    url = f"https://api.spotify.com/v1/tracks/{spotify_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, timeout=5)
    
    if response.status_code != 200:
        raise HTTPException(status_code=404, detail="Track not found on Spotify")
    
    data = response.json()
    
    # Process track artists
    track_artist_ids = []
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
        track_artist_ids.append(a["id"])
    
    # Process album
    album_data = data.get("album", {})
    album_artist_ids = []
    for a in album_data.get("artists", []):
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
    
    al_imgs = album_data.get("images", [])
    al_sma, al_med, al_lrg = get_image_qualities(al_imgs)
    rel_date = parse_date(album_data.get("release_date"), album_data.get("release_date_precision"))
    
    
    # Process track
    t_imgs = data.get("images", [])
    t_sma, t_med, t_lrg = get_image_qualities(t_imgs)
    t_sma = t_sma or al_sma
    t_med = t_med or al_med
    t_lrg = t_lrg or al_lrg
    
    duration_seconds = int(data.get("duration_ms", 0) / 1000)
    
    track, _ = create_or_get_track(
        db=db,
        spotify_id=spotify_id,
        name=data.get("name"),
        artist_ids=track_artist_ids,
        album_ids=[album_data.get("id")],
        duration=duration_seconds,
        image_url_small=t_sma,
        image_url_medium=t_med,
        image_url_large=t_lrg,
    )
    
    db.commit()
    return track