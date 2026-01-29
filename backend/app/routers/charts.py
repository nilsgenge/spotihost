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


# plays

def get_minutes_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    entity_filter: Optional[tuple] = None
):
    """Core logic for fetching minute buckets with optional entity filter"""
    
    # Base query
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
    
    data_map = {}
    for row in agg_results:
        data_map[row.bucket_time] = int(row.seconds / 60)

    # Helper function to truncate datetime to match DB truncation
    def truncate_datetime(dt: datetime, range_key: RangeKey) -> datetime:
        if range_key == "1d":
            return dt.replace(minute=0, second=0, microsecond=0)
        elif range_key in ["1w", "4w"]:
            return dt.replace(hour=0, minute=0, second=0, microsecond=0)
        elif range_key in ["3m", "6m"]:
            # Truncate to Monday of the week
            days_since_monday = dt.weekday()
            monday = dt - timedelta(days=days_since_monday)
            return monday.replace(hour=0, minute=0, second=0, microsecond=0)
        else:  # 1y
            return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Truncate start to match DB bucketing
    current = truncate_datetime(start_dt, range_key)
    buckets = []
    
    if range_key == "1d":
        # Hourly buckets
        while current < end_dt:
            bucket_end = current + timedelta(hours=1)
            buckets.append({
                "label": current.strftime("%H:%M"),
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end
            
    elif range_key in ["1w", "4w"]:
        # Daily buckets
        while current < end_dt:
            bucket_end = current + timedelta(days=1)
            buckets.append({
                "label": current.strftime("%d %b"),
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end
            
    elif range_key in ["3m", "6m"]:
        # Weekly buckets
        while current < end_dt:
            bucket_end = current + timedelta(weeks=1)
            buckets.append({
                "label": f"{current.strftime('%d/%m')} - {bucket_end.strftime('%d/%m')}",
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end
            
    else:  # 1y
        # Monthly buckets
        while current < end_dt:
            if current.month == 12:
                bucket_end = current.replace(year=current.year + 1, month=1)
            else:
                bucket_end = current.replace(month=current.month + 1)
            
            buckets.append({
                "label": current.strftime("%b %Y"),
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end

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


# Plays

def get_plays_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    entity_filter: Optional[tuple] = None
):
    """Core logic for fetching play COUNT buckets (not minutes)"""
    
    query = db.query(Listen.played_at)\
              .join(Track, Listen.track_id == Track.track_id)
    
    filters = [
        Listen.played_at.between(start_dt, end_dt),
        Listen.skipped == False
    ]
    
    if entity_filter:
        model, spotify_id, _, _ = entity_filter
        if model == Artist:
            query = query.join(track_artists).join(Artist)
            filters.append(Artist.spotify_id == spotify_id)
        elif model == Album:
            query = query.join(track_album).join(Album)
            filters.append(Album.spotify_id == spotify_id)
        elif model == Track:
            filters.append(Track.spotify_id == spotify_id)
    
    query = query.filter(*filters)
    
    # Alltime
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
    
    # Standard ranges
    truncator = get_truncator(range_key)
    
    agg_results = query.with_entities(
        truncator.label('bucket_time'),
        func.count(Listen.listen_id).label('play_count')
    ).group_by(truncator).order_by(truncator).all()
    
    data_map = {row.bucket_time: int(row.play_count) for row in agg_results}

    def truncate_datetime(dt: datetime, range_key: RangeKey) -> datetime:
        if range_key == "1d":
            return dt.replace(minute=0, second=0, microsecond=0)
        elif range_key in ["1w", "4w"]:
            return dt.replace(hour=0, minute=0, second=0, microsecond=0)
        elif range_key in ["3m", "6m"]:
            days_since_monday = dt.weekday()
            monday = dt - timedelta(days=days_since_monday)
            return monday.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    current = truncate_datetime(start_dt, range_key)
    buckets = []
    
    if range_key == "1d":
        while current < end_dt:
            bucket_end = current + timedelta(hours=1)
            buckets.append({
                "label": current.strftime("%H:%M"),
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end
            
    elif range_key in ["1w", "4w"]:
        while current < end_dt:
            bucket_end = current + timedelta(days=1)
            buckets.append({
                "label": current.strftime("%d %b"),
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end
            
    elif range_key in ["3m", "6m"]:
        while current < end_dt:
            bucket_end = current + timedelta(weeks=1)
            buckets.append({
                "label": f"{current.strftime('%d/%m')} - {bucket_end.strftime('%d/%m')}",
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end
            
    else:  # 1y
        while current < end_dt:
            if current.month == 12:
                bucket_end = current.replace(year=current.year + 1, month=1)
            else:
                bucket_end = current.replace(month=current.month + 1)
            
            buckets.append({
                "label": current.strftime("%b %Y"),
                "value": data_map.get(current, 0),
                "start": current.isoformat(),
                "end": bucket_end.isoformat()
            })
            current = bucket_end

    return buckets

@router.get("/plays")
def get_total_plays(
    start: str,
    end: str,
    range_key: RangeKey,
    db: Session = Depends(get_db)
):
    """Total play counts (not minutes)"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(db, range_key, start_dt, end_dt)}

@router.get("/plays/artist/{artist_id}")
def get_artist_plays(
    artist_id: str = Path(...),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Artist play counts"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(
        db, range_key, start_dt, end_dt, 
        entity_filter=(Artist, artist_id, None, None)
    )}

@router.get("/plays/album/{album_id}")
def get_album_plays(
    album_id: str = Path(...),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Album play counts"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(
        db, range_key, start_dt, end_dt,
        entity_filter=(Album, album_id, None, None)
    )}

@router.get("/plays/track/{track_id}")
def get_track_plays(
    track_id: str = Path(...),
    start: str = Query(...),
    end: str = Query(...),
    range_key: RangeKey = Query(...),
    db: Session = Depends(get_db)
):
    """Track play counts"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    return {"buckets": get_plays_buckets(
        db, range_key, start_dt, end_dt,
        entity_filter=(Track, track_id, None, None)
    )}