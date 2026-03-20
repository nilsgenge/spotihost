from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Numeric
from datetime import datetime, timedelta, timezone as dt_timezone
from app.database import get_db
from app.models import Listen, Track
from .utils import (
    RangeKey,
    get_utc_dt,
    get_local_timezone,
    calculate_alltime_range
)
from zoneinfo import ZoneInfo
from dateutil import rrule

router = APIRouter(prefix="/avg-song-length", tags=["charts"])


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
    Handles float values (minutes with decimals).
    """
    buckets = []

    start_local = start_dt_utc.astimezone(user_tz)
    end_local = end_dt_utc.astimezone(user_tz)

    current_dt = start_local

    while current_dt <= end_local:
        bucket_start_local = current_dt.replace(hour=0, minute=0, second=0, microsecond=0)

        # Collect averages for this interval
        interval_values = []
        for i in range(interval_days):
            check_date = bucket_start_local + timedelta(days=i)
            if check_date > end_local:
                break

            key_utc = check_date.astimezone(dt_timezone.utc)
            if key_utc in data_map:
                interval_values.append(data_map[key_utc])

        # Calculate average for bucket (float with 2 decimal places)
        if interval_values:
            bucket_value = round(sum(interval_values) / len(interval_values), 2)
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


def _generate_buckets_for_avg(
    range_key: RangeKey,
    start_dt_utc: datetime,
    end_dt_utc: datetime,
    data_map: dict,
    user_tz: ZoneInfo
) -> list[dict]:
    """
    Generate time buckets for average values (doesn't sum, just uses the averages directly).
    Similar to generate_buckets but doesn't sum values.
    """
    buckets = []

    start_local = start_dt_utc.astimezone(user_tz)
    end_local = end_dt_utc.astimezone(user_tz)

    if range_key == "1d":
        for dt in rrule.rrule(rrule.HOURLY, dtstart=start_local, until=end_local):
            key_utc = dt.astimezone(dt_timezone.utc).replace(minute=0, second=0, microsecond=0)
            buckets.append({
                "label": dt.strftime("%H:%M"),
                "value": data_map.get(key_utc, None),
                "start": key_utc.isoformat()
            })

    elif range_key in ["1w", "4w"]:
        interval_days = 1

        current_dt = start_local

        while current_dt <= end_local:
            bucket_start_local = current_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            key_utc = bucket_start_local.astimezone(dt_timezone.utc)

            label = bucket_start_local.strftime("%d %b")

            buckets.append({
                "label": label,
                "value": data_map.get(key_utc, None),
                "start": key_utc.isoformat()
            })

            current_dt += timedelta(days=interval_days)

    elif range_key == "1y":
        for dt in rrule.rrule(rrule.MONTHLY, dtstart=start_local, until=end_local, bymonthday=1):
            key_utc = dt.astimezone(dt_timezone.utc)
            buckets.append({
                "label": dt.strftime("%b %Y"),
                "value": data_map.get(key_utc, None),
                "start": key_utc.isoformat()
            })

    elif range_key == "alltime":
        for dt in rrule.rrule(rrule.YEARLY, dtstart=start_local, until=end_local, bymonth=1, bymonthday=1):
            year = dt.year
            buckets.append({
                "label": str(year),
                "value": data_map.get(year, None),
                "start": dt.isoformat()
            })

    return buckets


def get_avg_song_length_buckets(
    db: Session,
    range_key: RangeKey,
    start_dt: datetime,
    end_dt: datetime,
    user_tz: ZoneInfo,
) -> list[dict]:
    """
    Core logic for fetching average song length aggregated by time buckets.
    Duration is stored in seconds, converted to minutes (divide by 60).
    """
    # Handle alltime range
    if range_key == "alltime":
        start_year, end_year = calculate_alltime_range(db, db.query(Listen).filter(
            Listen.played_at.between(start_dt, end_dt),
            (Listen.skipped == False) | (Listen.skipped == None)
        ).join(Track, Listen.track_id == Track.track_id))

        # Rebuild query for alltime range - aggregate by year
        year_data = db.query(
            func.extract('year', Listen.played_at).label('y'),
            (func.avg(Track.duration) / 60.0).label('avg_minutes')
        ).join(Track, Listen.track_id == Track.track_id)\
         .filter(
             Listen.played_at.between(
                 datetime(start_year, 1, 1, tzinfo=dt_timezone.utc),
                 datetime(end_year + 1, 1, 1, tzinfo=dt_timezone.utc)
             ),
             (Listen.skipped == False) | (Listen.skipped == None)
         ).group_by('y').all()

        data_map = {int(row.y): float(row.avg_minutes) for row in year_data if row.y is not None and row.avg_minutes is not None}

        start_dt = datetime(start_year, 1, 1, tzinfo=dt_timezone.utc)
        end_dt = datetime(end_year, 12, 31, 23, 59, 59, tzinfo=dt_timezone.utc)

        return _generate_buckets_for_avg("alltime", start_dt, end_dt, data_map, user_tz)

    # Base query joining Listen -> Track
    query = db.query(
        Listen.played_at,
        (func.avg(Track.duration) / 60.0).label('avg_minutes')
    ).join(Track, Listen.track_id == Track.track_id)\
     .filter(
         Listen.played_at.between(start_dt, end_dt),
         (Listen.skipped == False) | (Listen.skipped == None)
     )

    # Handle 3m and 6m ranges with averaging
    if range_key in ["3m", "6m"]:
        interval_days = 3 if range_key == "3m" else 7

        # Get daily averages
        daily_agg = query.with_entities(
            func.date_trunc('day', Listen.played_at.op('AT TIME ZONE')('UTC').op('AT TIME ZONE')(user_tz.key)).label('bucket_day'),
            (func.avg(Track.duration) / 60.0).label('avg_minutes')
        ).group_by(
            func.date_trunc('day', Listen.played_at.op('AT TIME ZONE')('UTC').op('AT TIME ZONE')(user_tz.key))
        ).all()

        # Build daily data map with UTC keys
        daily_map = {}
        for row in daily_agg:
            if row.bucket_day and row.avg_minutes is not None:
                local_dt = row.bucket_day.replace(tzinfo=user_tz)
                utc_key = local_dt.astimezone(dt_timezone.utc)
                daily_map[utc_key] = float(row.avg_minutes)

        return _generate_average_buckets(range_key, start_dt, end_dt, daily_map, user_tz, interval_days)

    # Determine truncation level based on range
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
        (func.avg(Track.duration) / 60.0).label('avg_minutes')
    ).group_by(trunc_expr).all()

    data_map = {}
    for row in agg_results:
        if row.bucket_time and row.avg_minutes is not None:
            local_dt = row.bucket_time.replace(tzinfo=user_tz)
            utc_key = local_dt.astimezone(dt_timezone.utc)
            data_map[utc_key] = float(row.avg_minutes)

    return _generate_buckets_for_avg(range_key, start_dt, end_dt, data_map, user_tz)


@router.get("")
def get_total_avg_song_length(
    start: str,
    end: str,
    range_key: RangeKey,
    timezone: str = Query("UTC", description="User IANA timezone"),
    db: Session = Depends(get_db)
):
    """Get average song length across all tracks in minutes"""
    try:
        start_dt = get_utc_dt(start)
        end_dt = get_utc_dt(end)
        user_tz = get_local_timezone(timezone)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")

    return {"buckets": get_avg_song_length_buckets(db, range_key, start_dt, end_dt, user_tz)}
