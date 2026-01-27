import logging
import json
from datetime import datetime, date, timezone
import os
from typing import Dict, Any, List, Optional, Tuple

import requests
from sqlalchemy.orm import Session
from sqlalchemy import exc

from app.database import SessionLocal
from app.models import Artist, Album, Setting, Track, Listen, ImportJob
from app.utils.spotify import get_valid_spotify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# HELPER FUNCTIONS

def create_or_get_artist(
    db: Session,
    spotify_id: str,
    name: str,
    image_url_small: Optional[str] = None,
    image_url_medium: Optional[str] = None,
    image_url_large: Optional[str] = None,
) -> Tuple[Artist, bool]:
    """
    Create or retrieve an artist by Spotify ID.
    """
    artist = db.query(Artist).filter_by(spotify_id=spotify_id).first()
    
    if artist:
        return artist, False
    
    artist = Artist(
        spotify_id=spotify_id,
        name=name,
        image_url_small=image_url_small,
        image_url_medium=image_url_medium,
        image_url_large=image_url_large,
    )
    db.add(artist)
    db.flush()
    
    return artist, True


def create_or_get_album(
    db: Session,
    spotify_id: str,
    name: str,
    artist_ids: List[str],
    release_date: Optional[date] = None,
    release_date_precision: Optional[str] = None,
    album_type: Optional[str] = None,
    total_tracks: int = 0,
    image_url_small: Optional[str] = None,
    image_url_medium: Optional[str] = None,
    image_url_large: Optional[str] = None,
) -> Tuple[Album, bool]:
    """
    Create or retrieve an album by Spotify ID and link artists.
    """
    album = db.query(Album).filter_by(spotify_id=spotify_id).first()
    
    if album:
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in album.artists:
                album.artists.append(artist)
        return album, False
    
    album = Album(
        spotify_id=spotify_id,
        name=name,
        release_date=release_date,
        release_date_precision=release_date_precision,
        album_type=album_type,
        total_tracks=total_tracks,
        image_url_small=image_url_small,
        image_url_medium=image_url_medium,
        image_url_large=image_url_large,
    )
    db.add(album)
    db.flush()
    
    # Link artists
    for artist_spotify_id in artist_ids:
        artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
        if artist and artist not in album.artists:
            album.artists.append(artist)
    
    return album, True


def create_or_get_track(
    db: Session,
    spotify_id: str,
    name: str,
    artist_ids: List[str],
    album_ids: List[str],
    duration: Optional[int] = None,
    image_url_small: Optional[str] = None,
    image_url_medium: Optional[str] = None,
    image_url_large: Optional[str] = None,
) -> Tuple[Track, bool]:
    """
    Create or retrieve a track by Spotify ID and link artists and albums.
    """
    track = db.query(Track).filter_by(spotify_id=spotify_id).first()
    
    if track:
        # Link missing artists
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in track.artists:
                track.artists.append(artist)
        
        # Link missing albums
        for album_spotify_id in album_ids:
            album = db.query(Album).filter_by(spotify_id=album_spotify_id).first()
            if album and album not in track.albums:
                track.albums.append(album)
        
        return track, False
    
    track = Track(
        spotify_id=spotify_id,
        name=name,
        duration=duration,
        image_url_small=image_url_small,
        image_url_medium=image_url_medium,
        image_url_large=image_url_large,
    )
    db.add(track)
    db.flush()
    
    # Link artists
    for artist_spotify_id in artist_ids:
        artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
        if artist and artist not in track.artists:
            track.artists.append(artist)
    
    # Link albums
    for album_spotify_id in album_ids:
        album = db.query(Album).filter_by(spotify_id=album_spotify_id).first()
        if album and album not in track.albums:
            track.albums.append(album)
    
    return track, True


def get_image_qualities(images: list) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Extract small, medium, and large image URLs from Spotify images array."""
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


def parse_date(date_str: str, precision: str) -> Optional[date]:
    """Parse Spotify date string based on precision."""
    if not date_str:
        return None
    try:
        if precision == 'year':
            return datetime.strptime(date_str, "%Y").date()
        elif precision == 'month':
            return datetime.strptime(date_str, "%Y-%m").date()
        elif precision == 'day':
            return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None
    return None


# API IMPORT

def process_item(db: Session, item: Dict[str, Any]):
    """Process a single recently played item from Spotify API."""
    try:
        raw_track = item.get("track", {})
        raw_album = raw_track.get("album", {})
        raw_context = item.get("context", {})
        played_at_str = item.get("played_at")

        played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00")) # type: ignore

        track_artist_ids = []
        for a in raw_track.get("artists", []):
            artist, _ = create_or_get_artist(
                db=db,
                spotify_id=a.get("id"),
                name=a.get("name"),
            )
            track_artist_ids.append(a.get("id"))

        album_artist_ids = []
        for a in raw_album.get("artists", []):
            artist, _ = create_or_get_artist(
                db=db,
                spotify_id=a.get("id"),
                name=a.get("name"),
            )
            album_artist_ids.append(a.get("id"))

        s_sma, s_med, s_lrg = get_image_qualities(raw_album.get("images", []))
        rel_date = parse_date(
            raw_album.get("release_date"),
            raw_album.get("release_date_precision")
        )
        
        album, _ = create_or_get_album(
            db=db,
            spotify_id=raw_album.get("id"),
            name=raw_album.get("name"),
            artist_ids=album_artist_ids,
            release_date=rel_date,
            release_date_precision=raw_album.get("release_date_precision"),
            album_type=raw_album.get("album_type"),
            total_tracks=raw_album.get("total_tracks", 0),
            image_url_small=s_sma,
            image_url_medium=s_med,
            image_url_large=s_lrg,
        )

        t_sma, t_med, t_lrg = get_image_qualities(raw_track.get("images", []))
        t_sma = t_sma or s_sma
        t_med = t_med or s_med
        t_lrg = t_lrg or s_lrg

        duration_seconds = int(raw_track.get("duration_ms", 0) / 1000)

        track, _ = create_or_get_track(
            db=db,
            spotify_id=raw_track.get("id"),
            name=raw_track.get("name"),
            artist_ids=track_artist_ids,
            album_ids=[raw_album.get("id")],
            duration=duration_seconds,
            image_url_small=t_sma,
            image_url_medium=t_med,
            image_url_large=t_lrg,
        )

        existing_listen = db.query(Listen).filter_by(
            track_id=track.track_id,
            played_at=played_at
        ).first()
        
        if not existing_listen:
            new_listen = Listen(
                track_id=track.track_id,
                played_at=played_at,
                context_type=raw_context.get("type") if raw_context else None
            )
            db.add(new_listen)
            logger.info(f"Inserted listen: {track.name}")
        else:
            logger.info(f"Listen already exists: {track.name}")

    except Exception as e:
        logger.error(f"Error processing item: {e}")
        raise


def ingest_recent_listens():
    """Fetch recently played tracks from Spotify API and process them."""
    db: Session = SessionLocal()
    
    try:
        logger.info("Fetching valid Spotify token...")
        token = get_valid_spotify_token(db)
        
        logger.info("Starting Spotify Ingestion...")
        url = "https://api.spotify.com/v1/me/player/recently-played?limit=50"
        
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])

        if not items:
            logger.info("No new listens found.")
            return

        for item in items:
            try:
                process_item(db, item)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error processing item: {e}")

        logger.info(f"Successfully processed {len(items)} items.")

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch from Spotify: {e}")
    except Exception as e:
        logger.critical(f"Unexpected error during ingestion: {e}")
        db.rollback()
    finally:
        db.close()


def get_ingest_interval_minutes(db: Session, fallback: int = 10) -> int:
    setting = (
        db.query(Setting)
        .filter(Setting.key == "ingest_interval_minutes")
        .first()
    )

    try:
        return int(setting.value) if setting and setting.value else fallback
    except (TypeError, ValueError):
        return fallback


# FILE IMPORT

def process_import_job(job_id: int, file_path: str):
    """
    Main function for file import. Reads file, batches IDs, and saves tracks/listens.
    Creates its own DB session as it runs as a background task.
    
    Args:
        job_id: ID of the ImportJob to process
        file_path: Path to the uploaded JSON file
    """
    db: Session = SessionLocal()
    
    logger.info(f"Starting Import Job {job_id} from {file_path}")
    
    try:
        # Get job
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Update job status
        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # Get Spotify token
        try:
            token = get_valid_spotify_token(db)
        except Exception as e:
            job.status = "failed"
            job.error_message = f"Could not get Spotify token: {str(e)}"
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            logger.error(f"Job {job_id} failed: {job.error_message}")
            return

        # Processing buffers
        uri_buffer = []
        file_items_buffer = []
        
        total_count = 0
        imported_count = 0
        skipped_count = 0

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                try:
                    json_data = json.load(f)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON file format: {e}")

            # Ensure we have a list
            if not isinstance(json_data, list):
                raise ValueError("JSON file does not contain a list of items")

            for index, data in enumerate(json_data):
                
                if not isinstance(data, dict):
                    skipped_count += 1
                    continue

                if not data.get("master_metadata_track_name"):
                    skipped_count += 1
                    continue
                
                if data.get("offline") and data.get("offline_timestamp") is None:
                    skipped_count += 1
                    continue

                track_uri = data.get("spotify_track_uri")
                if not track_uri or not track_uri.startswith("spotify:track:"):
                    skipped_count += 1
                    continue
                
                spotify_id = track_uri.split(":")[-1]
                
                ms_played = data.get("ms_played")
                
                if ms_played is not None:
                    if ms_played < 30000:
                        data["skipped"] = True
                    else:
                        data["skipped"] = False
            
                uri_buffer.append(spotify_id)
                file_items_buffer.append(data)
                total_count += 1

                # Process batch when buffer is full (50 items)
                if len(uri_buffer) >= 50:
                    count = _process_import_batch(
                        uri_buffer, 
                        file_items_buffer, 
                        token, 
                        job_id, 
                        db
                    )
                    imported_count += count
                    
                    # Update progress
                    job.imported_records = imported_count
                    job.total_records = total_count
                    db.commit()
                    
                    logger.info(f"Job {job_id}: Processed batch. Progress: {imported_count}/{total_count}")
                    
                    # Clear buffers
                    uri_buffer = []
                    file_items_buffer = []

            # Process remaining items (< 50)
            if uri_buffer:
                count = _process_import_batch(
                    uri_buffer, 
                    file_items_buffer, 
                    token, 
                    job_id, 
                    db
                )
                imported_count += count

            # Mark job as completed
            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.imported_records = imported_count
            job.total_records = total_count
            db.commit()
            
            logger.info(
                f"Import Job {job_id} completed successfully. "
                f"Records: {imported_count}/{total_count}, Skipped: {skipped_count}"
            )
            
            # Clean up file after successful import
            try:
                os.remove(file_path)
                logger.info(f"Deleted file: {file_path}")
            except Exception as e:
                logger.warning(f"Could not delete file {file_path}: {e}")

        except FileNotFoundError:
            job.status = "failed"
            job.error_message = f"File not found: {file_path}"
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            logger.error(f"Job {job_id} failed: File not found")
            
        except Exception as e:
            logger.error(f"Critical Error in Import Job {job_id}: {e}", exc_info=True)
            job.status = "failed"
            job.error_message = str(e)[:500]
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            
    except Exception as e:
        logger.critical(f"Critical DB Error in Job {job_id}: {e}", exc_info=True)
    finally:
        db.close()



def _process_import_batch(
    spotify_ids: List[str], 
    raw_items: List[Dict], 
    token: str, 
    job_id: int, 
    db: Session
) -> int:
    """
    Fetch 50 tracks from Spotify API and save them to database.
    Uses Savepoints to prevent losing valid data on duplicate errors.
    """
    if not spotify_ids:
        return 0

    # Fetch track metadata from Spotify API
    ids_string = ",".join(spotify_ids)
    url = f"https://api.spotify.com/v1/tracks?ids={ids_string}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Spotify API Batch Error: {e}")
        return 0

    tracks_data = data.get("tracks", [])
    
    track_id_map = {}
    
    for t_data in tracks_data:
        if not t_data:
            continue
        
        db_track_id = _create_or_get_track_from_api_data(t_data, db)
        if db_track_id:
            track_id_map[t_data.get("id")] = db_track_id

    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to commit tracks batch: {e}")
        db.rollback()
        return 0

    inserted_count = 0
    duplicate_count = 0
    
    for i, raw_item in enumerate(raw_items):
        spotify_id = spotify_ids[i]
        db_track_id = track_id_map.get(spotify_id)

        if not db_track_id:
            logger.warning(f"Could not resolve track ID for Spotify ID: {spotify_id}")
            continue

        played_at = None
        played_at_str = raw_item.get("ts")
        if played_at_str:
            try:
                played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
            except Exception:
                # Use offline timestamp as fallback
                pass

        # fallback offline timestamp
        if not played_at:
            raw_offline_ts = raw_item.get("offline_timestamp")
            if raw_offline_ts:
                try:
                    # Check if ms or s
                    if raw_offline_ts < 20000000000:
                        played_at = datetime.fromtimestamp(raw_offline_ts, tz=timezone.utc)
                    else:
                        played_at = datetime.fromtimestamp(raw_offline_ts / 1000, tz=timezone.utc)
                except Exception as e:
                    logger.warning(f"Invalid offline_timestamp: {raw_offline_ts}")

        # if no time available, skip listen
        if not played_at:
            logger.warning(f"Skipping item: No valid timestamp found for Spotify ID {spotify_id}")
            continue

        new_listen = Listen(
            track_id=db_track_id,
            played_at=played_at,
            import_job_id=job_id,
            ms_played=raw_item.get("ms_played"),
            skipped=raw_item.get("skipped"), 
            offline=raw_item.get("offline"),
            platform=raw_item.get("platform"),
            conn_country=raw_item.get("conn_country"),
            incognito_mode=raw_item.get("incognito_mode"),
        )

        sp = db.begin_nested()
        try:
            db.add(new_listen)
            db.flush()
            inserted_count += 1
        except exc.IntegrityError:
            sp.rollback() 
            duplicate_count += 1
        else:
            sp.commit()

    # Commit all successful listens
    try:
        db.commit()
        if duplicate_count > 0:
            logger.info(f"Batch completed: {inserted_count} new, {duplicate_count} duplicates")
    except Exception as e:
        logger.error(f"Error committing batch: {e}")
        db.rollback()
        return 0
    
    return inserted_count



def _create_or_get_track_from_api_data(track_data: Dict, db: Session) -> Optional[int]:
    """
    Create or get track from Spotify API response data.
    
    Args:
        track_data: Track object from Spotify API
        db: Database session
    
    Returns:
        Track ID (primary key) or None if creation failed
    """
    spotify_id = track_data.get("id")
    if not spotify_id:
        return None

    # Check if track already exists
    track = db.query(Track).filter(Track.spotify_id == spotify_id).first()
    if track:
        return track.track_id

    # Create/get artists
    track_artist_ids = []
    for a in track_data.get("artists", []):
        if not a.get("id") or not a.get("name"):
            continue
        artist, _ = create_or_get_artist(
            db=db,
            spotify_id=a.get("id"),
            name=a.get("name"),
        )
        track_artist_ids.append(a.get("id"))

    # Create/get album
    album_data = track_data.get("album")
    if not album_data or not album_data.get("id"):
        logger.warning(f"Track {spotify_id} has no album data")
        return None

    album_artist_ids = []
    for a in album_data.get("artists", []):
        if not a.get("id") or not a.get("name"):
            continue
        artist, _ = create_or_get_artist(
            db=db,
            spotify_id=a.get("id"),
            name=a.get("name"),
        )
        album_artist_ids.append(a.get("id"))

    s_sma, s_med, s_lrg = get_image_qualities(album_data.get("images", []))
    rel_date = parse_date(
        album_data.get("release_date"),
        album_data.get("release_date_precision")
    )
    
    album, _ = create_or_get_album(
        db=db,
        spotify_id=album_data.get("id"),
        name=album_data.get("name"),
        artist_ids=album_artist_ids,
        release_date=rel_date,
        release_date_precision=album_data.get("release_date_precision"),
        album_type=album_data.get("album_type"),
        total_tracks=album_data.get("total_tracks", 0),
        image_url_small=s_sma,
        image_url_medium=s_med,
        image_url_large=s_lrg,
    )

    # Create track
    t_sma, t_med, t_lrg = get_image_qualities(track_data.get("images", []))
    t_sma = t_sma or s_sma
    t_med = t_med or s_med
    t_lrg = t_lrg or s_lrg

    duration_seconds = int(track_data.get("duration_ms", 0) / 1000)

    track, _ = create_or_get_track(
        db=db,
        spotify_id=spotify_id,
        name=track_data.get("name") or "Unknown Track",
        artist_ids=track_artist_ids,
        album_ids=[album_data.get("id")],
        duration=duration_seconds,
        image_url_small=t_sma,
        image_url_medium=t_med,
        image_url_large=t_lrg,
    )

    return track.track_id