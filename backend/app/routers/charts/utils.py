from datetime import datetime, timedelta
from typing import Optional, Literal, Any
from sqlalchemy.orm import Session, Query
from sqlalchemy import func
from app.models import Listen, Track, Artist, Album, track_artists, track_album

RangeKey = Literal["1d", "1w", "4w", "3m", "6m", "1y", "alltime"]


def get_truncator(range_key: RangeKey):
    """Return SQLAlchemy truncator for the given range key"""
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


def truncate_datetime(dt: datetime, range_key: RangeKey) -> datetime:
    """Truncate datetime to match DB truncation logic"""
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


def apply_entity_filter(
    query: Query,
    artist_id: Optional[str], 
    album_id: Optional[str], 
    track_id: Optional[str]
) -> Query:
    """
    Apply entity filtering to a query in priority order: track > album > artist
    Returns the modified query
    """
    if track_id:
        return query.filter(Track.spotify_id == track_id)
    elif album_id:
        return query.join(track_album).join(Album).filter(Album.spotify_id == album_id)
    elif artist_id:
        return query.join(track_artists).join(Artist).filter(Artist.spotify_id == artist_id)
    
    return query


def generate_buckets(
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    data_map: dict
) -> list[dict]:
    """
    Generate time buckets with labels and fill with data from data_map.
    Works for both minutes and plays - just pass the appropriate data_map.
    """
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