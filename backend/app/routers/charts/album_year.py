from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone as dt_timezone
from app.database import get_db
from app.models import Listen, Track, Album, track_album
from .utils import (
    RangeKey,
    calculate_alltime_range,
    generate_buckets,
    get_utc_dt,
    get_local_timezone
)
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/album-year", tags=["charts"])


def get_album_year_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    user_tz: ZoneInfo,
) -> list[dict]:
    """
    Core logic for fetching average album release year aggregated by time buckets.
    """
    # Base query joining Listen -> Track -> Album
    query = db.query(
        Listen.played_at,
        func.round(func.avg(func.extract('year', Album.release_date))).label('avg_year')
    ).join(Track, Listen.track_id == Track.track_id)\
     .join(track_album, Track.track_id == track_album.c.track_id)\
     .join(Album, track_album.c.album_id == Album.album_id)\
     .filter(
         Listen.played_at.between(start_dt, end_dt),
         (Listen.skipped == False) | (Listen.skipped == None),
         Album.release_date.isnot(None)  # Only tracks with release date
     )

    # Handle alltime range
    if range_key == "alltime":
        start_year, end_year = calculate_alltime_range(db, db.query(Listen).filter(
            Listen.played_at.between(start_dt, end_dt),
            (Listen.skipped == False) | (Listen.skipped == None)
        ).join(Track, Listen.track_id == Track.track_id).join(
            track_album, Track.track_id == track_album.c.track_id
        ).join(Album, track_album.c.album_id == Album.album_id).filter(
            Album.release_date.isnot(None)
        ))

        # Rebuild query for alltime range
        query = db.query(
            func.extract('year', Listen.played_at).label('y'),
            func.round(func.avg(func.extract('year', Album.release_date))).label('avg_year')
        ).join(Track, Listen.track_id == Track.track_id)\
         .join(track_album, Track.track_id == track_album.c.track_id)\
         .join(Album, track_album.c.album_id == Album.album_id)\
         .filter(
             Listen.played_at.between(
                 datetime(start_year, 1, 1, tzinfo=dt_timezone.utc),
                 datetime(end_year + 1, 1, 1, tzinfo=dt_timezone.utc)
             ),
             (Listen.skipped == False) | (Listen.skipped == None),
             Album.release_date.isnot(None)
         )

        year_data = query.group_by('y').all()

        data_map = {int(row.y): int(row.avg_year) for row in year_data if row.y is not None and row.avg_year is not None}

        start_dt = datetime(start_year, 1, 1, tzinfo=dt_timezone.utc)
        end_dt = datetime(end_year, 12, 31, 23, 59, 59, tzinfo=dt_timezone.utc)

        return generate_buckets("alltime", start_dt, end_dt, data_map, user_tz)

    if range_key in ["3m", "6m"]:
        interval_days = 3 if range_key == "3m" else 7

        # Get daily averages
        daily_agg = query.with_entities(
            func.date_trunc('day', Listen.played_at.op('AT TIME ZONE')('UTC').op('AT TIME ZONE')(user_tz.key)).label('bucket_day'),
            func.round(func.avg(func.extract('year', Album.release_date))).label('avg_year')
        ).group_by(
            func.date_trunc('day', Listen.played_at.op('AT TIME ZONE')('UTC').op('AT TIME ZONE')(user_tz.key))
        ).all()

        # Build daily data map with UTC keys
        daily_map = {}
        for row in daily_agg:
            if row.bucket_day and row.avg_year is not None:
                local_dt = row.bucket_day.replace(tzinfo=user_tz)
                utc_key = local_dt.astimezone(dt_timezone.utc)
                daily_map[utc_key] = int(row.avg_year)

        return _generate_average_buckets(range_key, start_dt, end_dt, daily_map, user_tz, interval_days)

    trunc_level = "day"
    if range_key == "1d":
        trunc_level = "hour"
    elif range_key == "1y":
        trunc_level = "month"

    trunc_expr = func.date_trunc(
        trunc_level,
        Listen.played_at.op('AT TIME ZONE')('UTC').op('AT TIME ZONE')(user_tz.key)
    )

    agg_results = query.with_entities(
        trunc_expr.label('bucket_time'),
        func.round(func.avg(func.extract('year', Album.release_date))).label('avg_year')
    ).group_by(trunc_expr).all()

    data_map = {}
    for row in agg_results:
        if row.bucket_time and row.avg_year is not None:
            local_dt = row.bucket_time.replace(tzinfo=user_tz)
            utc_key = local_dt.astimezone(dt_timezone.utc)
            data_map[utc_key] = int(row.avg_year)

    return generate_buckets(range_key, start_dt, end_dt, data_map, user_tz)


def _generate_average_buckets(
    range_key: RangeKey,
    start_dt_utc: datetime,
    end_dt_utc: datetime,
    data_map: dict,
    user_tz: ZoneInfo,
    interval_days: int
) -> list[dict]:
    """
    Generate time buckets by averaging values across multi-day intervals.
    Used for 3m (3-day) and 6m (7-day) ranges.
    """
    buckets = []

    start_local = start_dt_utc.astimezone(user_tz)
    end_local = end_dt_utc.astimezone(user_tz)

    current_dt = start_local

    while current_dt <= end_local:
        bucket_start_local = current_dt.replace(hour=0, minute=0, second=0, microsecond=0)

        # Collect averages for this interval
        interval_years = []
        for i in range(interval_days):
            check_date = bucket_start_local + timedelta(days=i)
            if check_date > end_local:
                break

            key_utc = check_date.astimezone(dt_timezone.utc)
            if key_utc in data_map:
                interval_years.append(data_map[key_utc])

        # Calculate average for bucket
        if interval_years:
            bucket_value = round(sum(interval_years) / len(interval_years))
        else:
            bucket_value = None

        if interval_days == 1:
            label = bucket_start_local.strftime("%d %b")
        else:
            end_label_date = bucket_start_local + timedelta(days=interval_days - 1)
            label = f"{bucket_start_local.strftime('%d/%m')} - {end_label_date.strftime('%d/%m')}"

        buckets.append({
            "label": label,
            "value": bucket_value,
            "start": bucket_start_local.astimezone(dt_timezone.utc).isoformat()
        })

        current_dt += timedelta(days=interval_days)

    return buckets


@router.get("")
def get_total_album_year(
    start: str,
    end: str,
    range_key: RangeKey,
    timezone: str = Query("UTC", description="User IANA timezone"),
    db: Session = Depends(get_db)
):
    """Get average album release year across all tracks"""
    try:
        start_dt = get_utc_dt(start)
        end_dt = get_utc_dt(end)
        user_tz = get_local_timezone(timezone)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")

    return {"buckets": get_album_year_buckets(db, range_key, start_dt, end_dt, user_tz)}
