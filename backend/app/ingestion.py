"""
Ingestion module for spotihost.

Handles fetching listens from Spotify API and importing history from JSON files.
Implements listen merging to combine API-tracked and imported data.
"""
import logging
import json
from datetime import datetime, date, timezone, timedelta
import os
from typing import Dict, Any, List, Optional, Tuple
from queue import Queue
from threading import Thread, Lock

import requests
from sqlalchemy.orm import Session
from sqlalchemy import exc

from app.database import SessionLocal
from app.models import Artist, Album, Setting, Track, Listen, ImportJob
from app.utils.spotify import get_valid_spotify_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Merge window in seconds - listens within this time with same track are merged
MERGE_WINDOW_SECONDS = 2


# ============================================================================
# JOB QUEUE SYSTEM
# ============================================================================

class ImportJobQueue:
    """
    Queue system for processing import jobs sequentially.
    Prevents deadlocks from concurrent file imports.
    """
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.queue: Queue = Queue()
        self.worker_thread: Optional[Thread] = None
        self.running = False
        self._start_worker()

    def _start_worker(self):
        self.running = True
        self.worker_thread = Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()
        logger.info("Import job queue worker started")

    def _process_queue(self):
        """Process jobs from the queue sequentially."""
        while self.running:
            try:
                job_id, file_path = self.queue.get(timeout=1)
                if job_id is None:
                    continue
                logger.info(f"Processing import job {job_id} from queue")
                _process_import_job_internal(job_id, file_path)
                self.queue.task_done()
            except Exception:
                pass  # Timeout, continue loop

    def enqueue(self, job_id: int, file_path: str):
        """Add a job to the queue."""
        self.queue.put((job_id, file_path))
        logger.info(f"Enqueued import job {job_id}. Queue size: {self.queue.qsize()}")

    def get_queue_size(self) -> int:
        """Get current queue size."""
        return self.queue.qsize()

    def stop(self):
        """Stop worker thread."""
        self.running = False
        if self.worker_thread:
            self.queue.put((None, None))  # Signal to stop
            self.worker_thread.join(timeout=5)


# Global queue instance
import_queue = ImportJobQueue()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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
    Returns (artist, created) tuple.
    """
    artist = db.query(Artist).filter_by(spotify_id=spotify_id).first()

    if artist:
        # Update images if provided and currently null
        if image_url_small and not artist.image_url_small:
            artist.image_url_small = image_url_small
        if image_url_medium and not artist.image_url_medium:
            artist.image_url_medium = image_url_medium
        if image_url_large and not artist.image_url_large:
            artist.image_url_large = image_url_large
        return artist, False

    try:
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
    except exc.IntegrityError:
        # Race condition: another process created this artist
        db.rollback()
        artist = db.query(Artist).filter_by(spotify_id=spotify_id).first()
        if not artist:
            raise  # Something else went wrong
        return artist, False


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
    Returns (album, created) tuple.
    """
    album = db.query(Album).filter_by(spotify_id=spotify_id).first()

    if album:
        # Update missing fields
        if release_date and not album.release_date:
            album.release_date = release_date # type: ignore
            album.release_date_precision = release_date_precision
        if total_tracks and not album.total_tracks:
            album.total_tracks = total_tracks
        if image_url_small and not album.image_url_small:
            album.image_url_small = image_url_small
        if image_url_medium and not album.image_url_medium:
            album.image_url_medium = image_url_medium
        if image_url_large and not album.image_url_large:
            album.image_url_large = image_url_large

        # Link missing artists
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in album.artists:
                album.artists.append(artist)
        return album, False

    try:
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
    except exc.IntegrityError:
        db.rollback()
        album = db.query(Album).filter_by(spotify_id=spotify_id).first()
        if not album:
            raise
        # Still link artists
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in album.artists:
                album.artists.append(artist)
        return album, False


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
    Returns (track, created) tuple.
    """
    track = db.query(Track).filter_by(spotify_id=spotify_id).first()

    if track:
        # Update missing fields
        if duration and not track.duration:
            track.duration = duration
        if image_url_small and not track.image_url_small:
            track.image_url_small = image_url_small
        if image_url_medium and not track.image_url_medium:
            track.image_url_medium = image_url_medium
        if image_url_large and not track.image_url_large:
            track.image_url_large = image_url_large

        # Link missing artists and albums
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in track.artists:
                track.artists.append(artist)

        for album_spotify_id in album_ids:
            album = db.query(Album).filter_by(spotify_id=album_spotify_id).first()
            if album and album not in track.albums:
                track.albums.append(album)

        return track, False

    try:
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

        # Link artists and albums
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in track.artists:
                track.artists.append(artist)

        for album_spotify_id in album_ids:
            album = db.query(Album).filter_by(spotify_id=album_spotify_id).first()
            if album and album not in track.albums:
                track.albums.append(album)

        return track, True
    except exc.IntegrityError:
        db.rollback()
        track = db.query(Track).filter_by(spotify_id=spotify_id).first()
        if not track:
            raise
        # Still link artists and albums
        for artist_spotify_id in artist_ids:
            artist = db.query(Artist).filter_by(spotify_id=artist_spotify_id).first()
            if artist and artist not in track.artists:
                track.artists.append(artist)
        for album_spotify_id in album_ids:
            album = db.query(Album).filter_by(spotify_id=album_spotify_id).first()
            if album and album not in track.albums:
                track.albums.append(album)
        return track, False


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


# ============================================================================
# LISTEN MERGE LOGIC
# ============================================================================

def find_existing_listen(
    db: Session,
    track_id: int,
    played_at: datetime,
    merge_window_seconds: int = MERGE_WINDOW_SECONDS
) -> Optional[Listen]:
    """
    Find an existing listen for the same track within the merge window.

    This enables merging of API-tracked listens with import data when
    timestamps are slightly off (up to 2 seconds by default).
    """
    window = timedelta(seconds=merge_window_seconds)
    start_time = played_at - window
    end_time = played_at + window

    return db.query(Listen).filter(
        Listen.track_id == track_id,
        Listen.played_at >= start_time,
        Listen.played_at <= end_time,
    ).first()


def merge_listen_data(
    existing_listen: Listen,
    ms_played: Optional[int] = None,
    skipped: Optional[bool] = None,
    offline: Optional[bool] = None,
    platform: Optional[str] = None,
    conn_country: Optional[str] = None,
    incognito_mode: Optional[bool] = None,
) -> bool:
    """
    Merge import data into an existing listen.

    Strategy:
    - API listens have: context_type
    - Import listens have: ms_played, skipped, offline, platform, conn_country, incognito_mode

    When merging:
    - Keep context_type from API (import data doesn't have it)
    - Add import-specific fields if they're currently null
    - Remove import_job_id from merged listen (it was already tracked via API)

    Returns:
        True if any fields were updated
    """
    updated = False

    # Merge import-specific fields if currently null
    if existing_listen.ms_played is None and ms_played is not None:
        existing_listen.ms_played = ms_played
        updated = True

    if existing_listen.skipped is None and skipped is not None:
        existing_listen.skipped = skipped
        updated = True

    if existing_listen.offline is None and offline is not None:
        existing_listen.offline = offline
        updated = True

    if existing_listen.platform is None and platform is not None:
        existing_listen.platform = platform
        updated = True

    if existing_listen.conn_country is None and conn_country is not None:
        existing_listen.conn_country = conn_country
        updated = True

    if existing_listen.incognito_mode is None and incognito_mode is not None:
        existing_listen.incognito_mode = incognito_mode
        updated = True

    # Remove import_job_id because this listen was already tracked via API
    # This prevents the listen from being deleted when the import job is deleted
    if existing_listen.import_job_id is not None:
        existing_listen.import_job_id = None
        updated = True

    return updated


# ============================================================================
# API IMPORT
# ============================================================================

def process_item(db: Session, item: Dict[str, Any]):
    """
    Process a single recently played item from Spotify API.
    Supports merging with existing imported listens.
    """
    try:
        raw_track = item.get("track", {})
        raw_album = raw_track.get("album", {})
        raw_context = item.get("context", {})
        played_at_str = item.get("played_at")

        if not played_at_str or not raw_track.get("id"):
            logger.warning("Skipping item: missing played_at or track id")
            return

        played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))

        # Create/get artists
        track_artist_ids = []
        for a in raw_track.get("artists", []):
            if not a.get("id") or not a.get("name"):
                continue
            artist, _ = create_or_get_artist(
                db=db,
                spotify_id=a.get("id"),
                name=a.get("name"),
            )
            track_artist_ids.append(a.get("id"))

        # Create/get album artists
        album_artist_ids = []
        for a in raw_album.get("artists", []):
            if not a.get("id") or not a.get("name"):
                continue
            artist, _ = create_or_get_artist(
                db=db,
                spotify_id=a.get("id"),
                name=a.get("name"),
            )
            album_artist_ids.append(a.get("id"))

        # Create/get album
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

        # Create/get track
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

        # Check for existing listen (with merge window)
        existing_listen = find_existing_listen(db, track.track_id, played_at)

        if existing_listen:
            # This listen was tracked via import or API already
            # Just update context_type if missing (API provides context)
            if raw_context and existing_listen.context_type is None:
                existing_listen.context_type = raw_context.get("type")
                db.flush()
            logger.debug(f"Listen already exists: {track.name}")
        else:
            # Create new listen
            new_listen = Listen(
                track_id=track.track_id,
                played_at=played_at,
                context_type=raw_context.get("type") if raw_context else None
            )
            db.add(new_listen)
            db.flush()
            logger.info(f"Inserted listen: {track.name}")

    except Exception as e:
        logger.error(f"Error processing item: {e}")
        raise


def ingest_recent_listens(retries: int = 3, retry_delay: float = 0.5):
    """
    Fetch recently played tracks from Spotify API and process them.

    Args:
        retries: Number of times to retry if token is not immediately available
        retry_delay: Seconds to wait between retries
    """
    db: Session = SessionLocal()
    token = None
    last_error = None

    for attempt in range(retries):
        try:
            token = get_valid_spotify_token(db)
            last_error = None
            break
        except Exception as e:
            error_message = str(e)
            last_error = e

            # Skip ingestion if no user is logged in (no token available)
            # Only skip for the specific error message from get_valid_spotify_token
            if "No Spotify token found" in error_message and "Please login first" in error_message:
                if attempt < retries - 1:
                    import time
                    time.sleep(retry_delay)
                    continue
                else:
                    db.close()
                    return
            db.close()
            raise

    if last_error:
        db.close()
        raise last_error

    # Ensure token was successfully retrieved
    if token is None:
        db.close()
        raise Exception("Failed to retrieve Spotify token")

    try:

        url = "https://api.spotify.com/v1/me/player/recently-played?limit=50"

        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"}
        )
        logger.info(f"Spotify API response status: {response.status_code}")
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
            except exc.IntegrityError as e:
                db.rollback()
                logger.warning(f"Integrity error processing item, skipping: {e}")
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


# ============================================================================
# FILE IMPORT
# ============================================================================

def process_import_job(job_id: int, file_path: str):
    """
    Public entry point for file import.
    Enqueues job for sequential processing to prevent deadlocks.
    """
    import_queue.enqueue(job_id, file_path)


def _process_import_job_internal(job_id: int, file_path: str):
    """
    Internal function that actually processes an import job.
    Called by the queue worker.
    """
    db: Session = SessionLocal()

    logger.info(f"Processing Import Job {job_id} from {file_path}")

    try:
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

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
        merged_count = 0
        skipped_count = 0

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                try:
                    json_data = json.load(f)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON file format: {e}")

            if not isinstance(json_data, list):
                raise ValueError("JSON file does not contain a list of items")

            for data in json_data:
                if not isinstance(data, dict):
                    skipped_count += 1
                    continue

                # Skip podcasts and null tracks
                if not data.get("master_metadata_track_name"):
                    skipped_count += 1
                    continue

                # Skip offline entries without timestamp
                if data.get("offline") and data.get("offline_timestamp") is None:
                    skipped_count += 1
                    continue

                track_uri = data.get("spotify_track_uri")
                if not track_uri or not track_uri.startswith("spotify:track:"):
                    skipped_count += 1
                    continue

                spotify_id = track_uri.split(":")[-1]

                # Determine skipped based on play duration (< 30 seconds = skipped)
                ms_played = data.get("ms_played")
                if ms_played is not None:
                    data["skipped"] = ms_played < 30000
                else:
                    data["skipped"] = None

                uri_buffer.append(spotify_id)
                file_items_buffer.append(data)
                total_count += 1

                # Process batch when buffer is full (50 items)
                if len(uri_buffer) >= 50:
                    inserted, merged = _process_import_batch(
                        uri_buffer,
                        file_items_buffer,
                        token,
                        job_id,
                        db
                    )
                    imported_count += inserted
                    merged_count += merged

                    job.imported_records = imported_count + merged_count
                    job.total_records = total_count
                    db.commit()

                    logger.info(f"Job {job_id}: Progress: {imported_count + merged_count}/{total_count} (new: {inserted}, merged: {merged})")

                    uri_buffer = []
                    file_items_buffer = []

            # Process remaining items
            if uri_buffer:
                inserted, merged = _process_import_batch(
                    uri_buffer,
                    file_items_buffer,
                    token,
                    job_id,
                    db
                )
                imported_count += inserted
                merged_count += merged

            job.status = "completed"
            job.completed_at = datetime.now(timezone.utc)
            job.imported_records = imported_count + merged_count
            job.total_records = total_count
            db.commit()

            logger.info(
                f"Import Job {job_id} completed. "
                f"New: {imported_count}, Merged: {merged_count}, Skipped: {skipped_count}"
            )

            # Clean up file
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
) -> Tuple[int, int]:
    """
    Fetch up to 50 tracks from Spotify API and save/merge them to the database.

    Returns:
        Tuple of (newly_inserted_count, merged_count)
    """
    if not spotify_ids:
        return 0, 0

    ids_string = ",".join(spotify_ids)
    url = f"https://api.spotify.com/v1/tracks?ids={ids_string}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Spotify API Batch Error: {e}")
        return 0, 0

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
        return 0, 0

    inserted_count = 0
    merged_count = 0
    duplicate_count = 0

    for i, raw_item in enumerate(raw_items):
        spotify_id = spotify_ids[i]
        db_track_id = track_id_map.get(spotify_id)

        if not db_track_id:
            logger.warning(f"Could not resolve track ID for Spotify ID: {spotify_id}")
            continue

        # Parse timestamp
        played_at = _parse_import_timestamp(raw_item)
        if not played_at:
            logger.warning(f"Skipping item: No valid timestamp for Spotify ID {spotify_id}")
            continue

        # Check for existing listen within merge window
        existing_listen = find_existing_listen(db, db_track_id, played_at)

        if existing_listen:
            # Merge import data into existing listen
            was_updated = merge_listen_data(
                existing_listen,
                ms_played=raw_item.get("ms_played"),
                skipped=raw_item.get("skipped"),
                offline=raw_item.get("offline"),
                platform=raw_item.get("platform"),
                conn_country=raw_item.get("conn_country"),
                incognito_mode=raw_item.get("incognito_mode"),
            )

            if was_updated:
                db.flush()
                merged_count += 1
            else:
                duplicate_count += 1
        else:
            # Create new listen
            sp = db.begin_nested()
            try:
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
                db.add(new_listen)
                db.flush()
                inserted_count += 1
                sp.commit()
            except exc.IntegrityError:
                sp.rollback()
                duplicate_count += 1

    try:
        db.commit()
        if duplicate_count > 0:
            logger.info(f"Batch: {inserted_count} new, {merged_count} merged, {duplicate_count} exact duplicates")
    except Exception as e:
        logger.error(f"Error committing batch: {e}")
        db.rollback()
        return 0, 0

    return inserted_count, merged_count


def _parse_import_timestamp(raw_item: Dict) -> Optional[datetime]:
    """
    Parse timestamp from import data, handling both regular and offline timestamps.

    Regular timestamps: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")
    Offline timestamps: Unix timestamp (seconds or milliseconds)
    """
    played_at = None
    played_at_str = raw_item.get("ts")

    if played_at_str:
        try:
            played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
        except Exception:
            pass

    # Fallback to offline timestamp
    if not played_at:
        raw_offline_ts = raw_item.get("offline_timestamp")
        if raw_offline_ts:
            try:
                # Detect if milliseconds or seconds based on magnitude
                # Current timestamps: ~1.7 billion (seconds) or ~1.7 trillion (ms)
                # Threshold of 10 billion separates the two
                if raw_offline_ts < 10000000000:
                    played_at = datetime.fromtimestamp(raw_offline_ts, tz=timezone.utc)
                else:
                    played_at = datetime.fromtimestamp(raw_offline_ts / 1000, tz=timezone.utc)
            except Exception:
                pass

    return played_at


def _create_or_get_track_from_api_data(track_data: Dict, db: Session) -> Optional[int]:
    """
    Create or get a track from Spotify API response data.
    Returns the database track ID.
    """
    spotify_id = track_data.get("id")
    if not spotify_id:
        return None

    try:
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

        # Create/get track
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
    except exc.IntegrityError as e:
        logger.warning(f"Integrity error creating track {spotify_id}: {e}")
        db.rollback()
        track = db.query(Track).filter_by(spotify_id=spotify_id).first()
        return track.track_id if track else None
