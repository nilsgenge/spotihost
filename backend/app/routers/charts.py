from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Literal, Optional
from app.database import get_db
from app.models import Listen, Track, Artist, track_artists, Album, track_album

router = APIRouter(prefix="/charts", tags=["charts"])

RangeKey = Literal["1d", "1w", "4w", "3m", "6m", "1y", "alltime"]

def get_truncator(range_key: RangeKey):
    truncators = {
        "1d": func.date_trunc('hour', Listen.played_at),
        "1w": func.date_trunc('day', Listen.played_at),
        "4w": func.date_trunc('day', Listen.played_at),
        "3m": func.date_trunc('week', Listen.played_at),
        "6m": func.date_trunc('week', Listen.played_at),
        "1y": func.date_trunc('month', Listen.played_at),
        "alltime": func.extract('year', Listen.played_at)
    }
    return truncators[range_key]

def calculate_alltime_range(db: Session, query) -> tuple[int, int]:
    """Calculate year range for alltime view"""
    year_stats = query.with_entities(
        func.min(func.extract('year', Listen.played_at)),
        func.max(func.extract('year', Listen.played_at))
    ).first()
    
    if not year_stats[0]:
        current = datetime.now().year
        return (current - 3, current)
    
    min_y, max_y = int(year_stats[0]), int(year_stats[1])
    start_y = min_y - 1
    end_y = max_y
    if (end_y - start_y + 1) < 4:
        start_y = end_y - 3
        
    return (start_y, end_y)

def format_bucket(bucket_time: datetime, range_key: RangeKey):
    """Format label and calculate end time"""
    if isinstance(bucket_time, (int, float)):
        year = int(bucket_time)
        return {
            "label": str(year),
            "start": datetime(year, 1, 1),
            "end": datetime(year + 1, 1, 1)
        }
    
    if range_key == "1d":
        end_time = bucket_time + timedelta(hours=1)
        label = bucket_time.strftime("%H:%M")
    elif range_key in ["1w", "4w"]:
        end_time = bucket_time + timedelta(days=1)
        label = bucket_time.strftime("%d %b")
    elif range_key in ["3m", "6m"]:
        end_time = bucket_time + timedelta(weeks=1)
        label = f"{bucket_time.strftime('%d/%m')} - {end_time.strftime('%d/%m')}"
    else:  # 1y
        if bucket_time.month == 12:
            end_time = bucket_time.replace(year=bucket_time.year + 1, month=1)
        else:
            end_time = bucket_time.replace(month=bucket_time.month + 1)
        label = bucket_time.strftime("%b %Y")
    
    return {"label": label, "start": bucket_time, "end": end_time}

def get_minutes_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    entity_filter: Optional[tuple] = None
):
    """Core logic for fetching minute buckets with optional entity filter"""
    
    query = db.query(Listen.played_at, Track.duration)\
              .join(Track, Listen.track_id == Track.track_id)
    
    filters = [
        Listen.played_at.between(start_dt, end_dt),
        Listen.skipped == False
    ]
    
    # Apply entity filter if provided
    if entity_filter:
        model, spotify_id, join_table, join_field = entity_filter
        if model == Artist:
            query = query.join(track_artists).join(Artist)
            filters.append(Artist.spotify_id == spotify_id)
        elif model == Album:
            query = query.join(track_album).join(Album)
            filters.append(Album.spotify_id == spotify_id)
        elif model == Track:
            filters.append(Track.spotify_id == spotify_id)
    
    query = query.filter(*filters)
    
    # Handle alltime
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
                "value": data_map.get(y, None),
                "start": datetime(y, 1, 1).isoformat(),
                "end": datetime(y + 1, 1, 1).isoformat()
            }
            for y in range(start_year, end_year + 1)
        ]
    
    # Standard ranges
    truncator = get_truncator(range_key)
    results = query.with_entities(
        truncator.label('bucket_time'),
        func.coalesce(func.sum(Track.duration), 0).label('seconds')
    ).group_by(truncator).order_by(truncator).all()
    
    buckets = []
    for row in results:
        fmt = format_bucket(row.bucket_time, range_key)
        buckets.append({
            "label": fmt["label"],
            "value": int(row.seconds / 60),
            "start": fmt["start"].isoformat(),
            "end": fmt["end"].isoformat()
        })
    
    return buckets

@router.get("/minutes")
def get_total_minutes(
    start: str,
    end: str,
    range_key: RangeKey,
    db: Session = Depends(get_db)
):
    """All tracks aggregated"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(db, range_key, start_dt, end_dt)}

@router.get("/minutes/artist/{artist_id}")
def get_artist_minutes(
    artist_id: str = Path(..., description="Spotify Artist ID"),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Specific artist minutes"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(
        db, range_key, start_dt, end_dt, 
        entity_filter=(Artist, artist_id, track_artists, None)
    )}

@router.get("/minutes/album/{album_id}")
def get_album_minutes(
    album_id: str = Path(..., description="Spotify Album ID"),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Specific album minutes"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(
        db, range_key, start_dt, end_dt,
        entity_filter=(Album, album_id, track_album, None)
    )}

@router.get("/minutes/track/{track_id}")
def get_track_minutes(
    track_id: str = Path(..., description="Spotify Track ID"),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Specific track minutes"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_minutes_buckets(
        db, range_key, start_dt, end_dt,
        entity_filter=(Track, track_id, None, None)
    )}