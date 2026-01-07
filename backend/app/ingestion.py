import logging
from datetime import datetime
from typing import Dict, Any

import requests
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models import (
    Artist, Album, Track, Listen,
)
from app.utils.spotify import get_valid_spotify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_or_create(session, model, defaults=None, cache=None, **kwargs):
    if cache:
        spotify_id = kwargs.get('spotify_id')
        if spotify_id:
            cache_key = (model, spotify_id)
            if cache_key in cache:
                return cache[cache_key], False

    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        if cache:
            spotify_id = kwargs.get('spotify_id')
            if spotify_id:
                cache_key = f"{model.__name__}_{spotify_id}"
                cache[cache_key] = instance
        return instance, False
    
    params = {k: v for k, v in kwargs.items() if not isinstance(v, (list, tuple, dict, Session))}
    params.update(defaults or {})
    instance = model(**params)
    session.add(instance)
    
    if cache:
        spotify_id = kwargs.get('spotify_id')
        if spotify_id:
            cache_key = f"{model.__name__}_{spotify_id}"
            cache[cache_key] = instance
        
    session.flush()

    return instance, True

def get_image_qualities(images: list):
    if not images:
        return None, None, None
    
    sorted_images = sorted(images, key=lambda img: img.get('height', 0))
    small = sorted_images[0].get('url')
    large = sorted_images[-1].get('url')
    
    medium = small
    if len(sorted_images) >= 3:
        medium = sorted_images[1].get('url')
    elif len(sorted_images) == 2:
        medium = large

    return small, medium, large

def parse_date(date_str: str, precision: str):
    if not date_str:
        return None
    if precision == 'year':
        return datetime.strptime(date_str, "%Y").date()
    elif precision == 'day':
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    return None

def process_item(db: Session, item: Dict[str, Any], created_cache: dict):
    try:
        raw_track = item.get("track", {})
        raw_album = raw_track.get("album", {})
        raw_context = item.get("context", {})
        played_at_str = item.get("played_at")

        # 1. Parse Timestamp
        played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00")) # type: ignore

        # 3. Process Artists
        track_artist_ids = []
        for a in raw_track.get("artists", []):
            artist, _ = get_or_create(
                db, 
                Artist, 
                spotify_id=a.get("id"), 
                defaults={"name": a.get("name")},
                cache=created_cache
            )
            track_artist_ids.append(artist)

        album_artist_ids = []
        for a in raw_album.get("artists", []):
            artist, _ = get_or_create(
                db, 
                Artist, 
                spotify_id=a.get("id"), 
                defaults={"name": a.get("name")},
                cache=created_cache
            )
            album_artist_ids.append(artist)

       # 4. Process Album
        s_sma, s_med, s_lrg = get_image_qualities(raw_album.get("images", []))
        rel_date = parse_date(raw_album.get("release_date"), raw_album.get("release_date_precision"))
        
        album, _ = get_or_create(
            db, Album, spotify_id=raw_album.get("id"),
            defaults={
                "name": raw_album.get("name"),
                "release_date": rel_date,
                "release_date_precision": raw_album.get("release_date_precision"),
                "album_type": raw_album.get("album_type"),
                "total_tracks": raw_album.get("total_tracks"),
                "image_url_small": s_sma,
                "image_url_medium": s_med,
                "image_url_large": s_lrg,
            },
            cache=created_cache
        )

        # 5. Process Track
        t_sma, t_med, t_lrg = get_image_qualities(raw_track.get("images", []))
        t_sma = t_sma or s_sma
        t_med = t_med or s_med
        t_lrg = t_lrg or s_lrg

        duration_seconds = int(raw_track.get("duration_ms", 0) / 1000)

        track, _ = get_or_create(
            db, Track, spotify_id=raw_track.get("id"),
            defaults={
                "name": raw_track.get("name"),
                "duration": duration_seconds,
                "image_url_small": t_sma,
                "image_url_medium": t_med,
                "image_url_large": t_lrg,
            },
            cache=created_cache
        )

        # Track ↔ Artists
        for artist in track_artist_ids:
            if artist not in track.artists:
                track.artists.append(artist)

        # Album ↔ Artists
        for artist in album_artist_ids:
            if artist not in album.artists:
                album.artists.append(artist)

        # Track ↔ Album
        if album not in track.albums:
            track.albums.append(album)


        # 7. Create Listen
        new_listen = Listen(
            track_id=track.track_id,
            played_at=played_at,
            context_type=raw_context.get("type")
        )
        db.add(new_listen)

        logger.info(f"Inserted: {track.name}")

    except Exception as e:
        logger.error(f"Error processing item: {e}")
        db.rollback()

def ingest_recent_listens():
    """
    Fetches data from Spotify API and processes it.
    """
    db: Session = SessionLocal()
    
    try:
        logger.info("Fetching valid Spotify token...")
        token = get_valid_spotify_token(db)
        
        logger.info("Starting Spotify Ingestion...")
        url = "https://api.spotify.com/v1/me/player/recently-played?limit=50"
        
        response = requests.get( # type: ignore
            url,
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])

        if not items:
            logger.info("No new listens found.")
            return

        created_cache = {}
        for item in items:
            try:
                process_item(db, item, created_cache)
                db.commit()
            except IntegrityError:
                db.rollback()
                logger.info("Duplicate listen skipped")
            except Exception as e:
                db.rollback()
                logger.error(f"Error processing item: {e}")

        logger.info(f"Successfully processed {len(items)} items.")

    except requests.exceptions.RequestException as e: # type: ignore
        logger.error(f"Failed to fetch from Spotify: {e}")
    except Exception as e:
        logger.critical(f"Unexpected error during ingestion: {e}")
        db.rollback()
    finally:
        db.close()