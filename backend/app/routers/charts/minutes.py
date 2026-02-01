from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.models import Listen, Track
from .utils import (
    RangeKey,
    get_truncator,
    calculate_alltime_range,
    apply_entity_filter,
    generate_buckets
)

router = APIRouter(prefix="/minutes", tags=["charts"])


def get_minutes_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    artist_id: Optional[str] = None,
    album_id: Optional[str] = None,
    track_id: Optional[str] = None
) -> list[dict]:
    """
    Core logic for fetching listening minutes aggregated by time buckets.
    Supports optional filtering by artist, album, or track.
    """
    # Base query
    query = db.query(Listen.played_at, Track.duration)\
              .join(Track, Listen.track_id == Track.track_id)\
              .filter(
                  Listen.played_at.between(start_dt, end_dt),
                  Listen.skipped == False
              )
    
    # Apply entity filter
    query = apply_entity_filter(query, artist_id, album_id, track_id)
    
    # Handle alltime range
    if range_key == "alltime":
        start_year, end_year = calculate_alltime_range(db, query)
        
        year_data = query.with_entities(
            func.extract('year', Listen.played_at).label('y'),
            func.coalesce(func.sum(Track.duration), 0).label('seconds')
        ).group_by('y').all()
        
        data_map = {int(row.y): int(row.seconds / 60) for row in year_data}
        
        return [
            {
                "label": str(y),
                "value": data_map.get(y, 0),
                "start": datetime(y, 1, 1).isoformat(),
                "end": datetime(y + 1, 1, 1).isoformat()
            }
            for y in range(start_year, end_year + 1)
        ]
    
    # Get truncator and aggregated data
    truncator = get_truncator(range_key)
    
    agg_results = query.with_entities(
        truncator.label('bucket_time'),
        func.coalesce(func.sum(Track.duration), 0).label('seconds')
    ).group_by(truncator).order_by(truncator).all()
    
    # Convert to minutes
    data_map = {row.bucket_time: int(row.seconds / 60) for row in agg_results}
    
    # Generate complete bucket list
    return generate_buckets(range_key, start_dt, end_dt, data_map)


@router.get("")
def get_total_minutes(
    start: str,
    end: str,
    range_key: RangeKey,
    db: Session = Depends(get_db)
):
    """Get total listening minutes across all tracks"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(db, range_key, start_dt, end_dt)}


@router.get("/artist/{artist_id}")
def get_artist_minutes(
    artist_id: str = Path(..., description="Spotify Artist ID"),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Get listening minutes for a specific artist"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(
        db, range_key, start_dt, end_dt, artist_id=artist_id
    )}


@router.get("/album/{album_id}")
def get_album_minutes(
    album_id: str = Path(..., description="Spotify Album ID"),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Get listening minutes for a specific album"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(
        db, range_key, start_dt, end_dt, album_id=album_id
    )}


@router.get("/track/{track_id}")
def get_track_minutes(
    track_id: str = Path(..., description="Spotify Track ID"),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Get listening minutes for a specific track"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(
        db, range_key, start_dt, end_dt, track_id=track_id
    )}