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

router = APIRouter(prefix="/plays", tags=["charts"])


def get_plays_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    artist_id: Optional[str] = None,
    album_id: Optional[str] = None,
    track_id: Optional[str] = None
) -> list[dict]:
    """
    Core logic for fetching play counts aggregated by time buckets.
    Supports optional filtering by artist, album, or track.
    """
    # Base query
    query = db.query(Listen.played_at)\
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
            func.count(Listen.listen_id).label('play_count')
        ).group_by('y').all()
        
        data_map = {int(row.y): int(row.play_count) for row in year_data}
        
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
        func.count(Listen.listen_id).label('play_count')
    ).group_by(truncator).order_by(truncator).all()
    
    data_map = {row.bucket_time: int(row.play_count) for row in agg_results}
    
    # Generate complete bucket list
    return generate_buckets(range_key, start_dt, end_dt, data_map)


# Line chart endpoints

@router.get("")
def get_total_plays(
    start: str,
    end: str,
    range_key: RangeKey,
    db: Session = Depends(get_db)
):
    """Get total play counts across all tracks"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(db, range_key, start_dt, end_dt)}


@router.get("/artist/{artist_id}")
def get_artist_plays(
    artist_id: str = Path(...),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Get play counts for a specific artist"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(
        db, range_key, start_dt, end_dt, artist_id=artist_id
    )}


@router.get("/album/{album_id}")
def get_album_plays(
    album_id: str = Path(...),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Get play counts for a specific album"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(
        db, range_key, start_dt, end_dt, album_id=album_id
    )}


@router.get("/track/{track_id}")
def get_track_plays(
    track_id: str = Path(...),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Get play counts for a specific track"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(
        db, range_key, start_dt, end_dt, track_id=track_id
    )}


# Categorical bar chart endpoint

@router.get("/categorical/{category}")
def get_categorical_plays(
    category: str = Path(..., description="dayofweek, month, or year"),
    start: str = Query(...),
    end: str = Query(...),
    artist_id: Optional[str] = Query(None),
    album_id: Optional[str] = Query(None),
    track_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns play counts aggregated by category:
    - dayofweek: 0-6 (Mon-Sun), labels: Mon, Tue, etc.
    - month: 1-12, labels: Jan, Feb, etc.
    - year: actual years, labels: 2020, 2021, etc.
    """
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    if category not in ["dayofweek", "month", "year"]:
        raise HTTPException(400, detail="Category must be dayofweek, month, or year")
    
    # Base query
    query = db.query(Listen).filter(
        Listen.played_at.between(start_dt, end_dt),
        Listen.skipped == False
    ).join(Track, Listen.track_id == Track.track_id)
    
    # Apply entity filters
    query = apply_entity_filter(query, artist_id, album_id, track_id)
    
    if category == "dayofweek":
        results = query.with_entities(
            func.extract('dow', Listen.played_at).label('dow'),
            func.count(Listen.listen_id).label('plays')
        ).group_by('dow').all()
        
        # Convert PostgreSQL day-of-week (0=Sun) to ISO (0=Mon)
        data_map = {}
        for row in results:
            pg_dow = int(row.dow)
            iso_dow = (pg_dow - 1) % 7
            data_map[iso_dow] = int(row.plays)
        
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        buckets = [
            {
                "label": days[i],
                "value": data_map.get(i, 0),
                "key": i
            }
            for i in range(7)
        ]
        
    elif category == "month":
        results = query.with_entities(
            func.extract('month', Listen.played_at).label('m'),
            func.count(Listen.listen_id).label('plays')
        ).group_by('m').all()
        
        data_map = {int(row.m): int(row.plays) for row in results}
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        buckets = [
            {
                "label": months[i],
                "value": data_map.get(i + 1, 0),
                "key": i + 1
            }
            for i in range(12)
        ]
        
    else:  # year
        results = query.with_entities(
            func.extract('year', Listen.played_at).label('y'),
            func.count(Listen.listen_id).label('plays')
        ).group_by('y').order_by('y').all()
        
        buckets = [
            {
                "label": str(int(row.y)),
                "value": int(row.plays),
                "key": int(row.y)
            }
            for row in results
        ]
    
    total_plays = sum(b["value"] for b in buckets)
    
    return {
        "buckets": buckets,
        "category": category,
        "total": total_plays
    }