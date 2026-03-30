from datetime import datetime, timedelta, timezone
from typing import Optional, Literal, Any, Dict
from sqlalchemy.orm import Session, Query
from sqlalchemy import func
from app.models import Listen, Track, Artist, Album, track_artists, track_album
from zoneinfo import ZoneInfo
from dateutil import rrule

RangeKey = Literal["1d", "1w", "4w", "3m", "6m", "1y", "alltime"]

def get_utc_dt(iso_str: str) -> datetime:
    """Parse ISO string to timezone-aware UTC datetime."""
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def get_local_timezone(tz_name: str) -> ZoneInfo:
    """Safe retrieval of ZoneInfo timezone."""
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return ZoneInfo("UTC")

def calculate_alltime_range(db: Session, query) -> tuple[int, int]:
    """Calculate year range for alltime view, capped to current year."""
    current_year = datetime.now().year
    
    year_stats = query.with_entities(
        func.min(func.extract('year', Listen.played_at)),
        func.max(func.extract('year', Listen.played_at))
    ).first()
    
    if not year_stats[0]:
        return (current_year - 3, current_year)
    
    min_y = int(year_stats[0])
    max_y = min(int(year_stats[1]), current_year)
    
    start_y = min_y - 1
    end_y = max_y
    
    if (end_y - start_y + 1) < 4:
        start_y = end_y - 3
        
    return (start_y, end_y)

def apply_entity_filter(
    query: Query,
    artist_id: Optional[str], 
    album_id: Optional[str], 
    track_id: Optional[str]
) -> Query:
    """Apply entity filtering to a query in priority order: track > album > artist"""
    if track_id:
        return query.filter(Track.spotify_id == track_id)
    elif album_id:
        return query.join(track_album).join(Album).filter(Album.spotify_id == album_id)
    elif artist_id:
        return query.join(track_artists).join(Artist).filter(Artist.spotify_id == artist_id)
    
    return query


def generate_buckets(
    range_key: RangeKey,
    start_dt_utc: datetime,
    end_dt_utc: datetime,
    data_map: Dict[Any, int],
    user_tz: ZoneInfo
) -> list[dict]:
    """
    Generate time buckets with labels, filling gaps with 0.
    Handles 3-day and 7-day intervals required for 3M and 6M ranges.
    """
    buckets = []
    
    start_local = start_dt_utc.astimezone(user_tz)
    end_local = end_dt_utc.astimezone(user_tz)

    if range_key == "1d":
        for dt in rrule.rrule(rrule.HOURLY, dtstart=start_local + timedelta(hours=1), until=end_local):
            key_utc = dt.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
            buckets.append({
                "label": dt.strftime("%H:%M"),
                "value": data_map.get(key_utc, 0),
                "start": key_utc.isoformat()
            })

    elif range_key in ["1w", "4w", "3m", "6m"]:
        interval_days = 1
        if range_key == "3m": interval_days = 3
        if range_key == "6m": interval_days = 7
        
        current_dt = start_local
        
        while current_dt <= end_local:
            bucket_start_local = current_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            
            interval_sum = 0
            for i in range(interval_days):
                check_date = bucket_start_local + timedelta(days=i)
                if check_date > end_local:
                    break
                
                key_utc = check_date.astimezone(timezone.utc)
                interval_sum += data_map.get(key_utc, 0)

            if interval_days == 1:
                label = bucket_start_local.strftime("%d %b")
            else:
                end_label_date = bucket_start_local + timedelta(days=interval_days - 1)
                label = f"{bucket_start_local.strftime('%d/%m')} - {end_label_date.strftime('%d/%m')}"

            buckets.append({
                "label": label,
                "value": interval_sum,
                "start": bucket_start_local.astimezone(timezone.utc).isoformat()
            })
            
            current_dt += timedelta(days=interval_days)

    elif range_key == "1y":
        for dt in rrule.rrule(rrule.MONTHLY, dtstart=start_local, until=end_local, bymonthday=1):
            key_utc = dt.astimezone(timezone.utc)
            buckets.append({
                "label": dt.strftime("%b %Y"),
                "value": data_map.get(key_utc, 0),
                "start": key_utc.isoformat()
            })

    elif range_key == "alltime":
        for dt in rrule.rrule(rrule.YEARLY, dtstart=start_local, until=end_local, bymonth=1, bymonthday=1):
            year = dt.year
            buckets.append({
                "label": str(year),
                "value": data_map.get(year, 0),
                "start": dt.isoformat()
            })

    return buckets