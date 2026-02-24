from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone as dt_timezone
from app.database import get_db
from app.models import Listen, Track
from .utils import (
    RangeKey,
    get_utc_dt,
    get_local_timezone,
    generate_buckets,
    apply_entity_filter,
    calculate_alltime_range
)

router = APIRouter(prefix="/minutes", tags=["charts"])

@router.get("")
def get_total_minutes(
    start: str,
    end: str,
    range_key: RangeKey,
    timezone: str = Query("UTC", description="User IANA timezone"),
    db: Session = Depends(get_db)
):
    """
    Get total listening minutes aggregated by dynamic time buckets.
    """

    start_dt = get_utc_dt(start)
    end_dt = get_utc_dt(end)
    user_tz = get_local_timezone(timezone)

    # Base Query
    query = db.query(Listen.played_at, Track.duration)\
              .join(Track, Listen.track_id == Track.track_id)\
              .filter(
                  Listen.played_at.between(start_dt, end_dt),
                  Listen.skipped == False
              )

    # Handle Alltime Range specifically
    if range_key == "alltime":
        start_year, end_year = calculate_alltime_range(db, query)
        
        query_start_dt = datetime(start_year, 1, 1, tzinfo=dt_timezone.utc)
        query_end_dt = datetime(end_year + 1, 1, 1, tzinfo=dt_timezone.utc)
        
        query = query.filter(Listen.played_at.between(query_start_dt, query_end_dt))

        year_data = query.with_entities(
            func.extract('year', Listen.played_at).label('year'),
            func.coalesce(func.sum(Track.duration), 0).label('seconds')
        ).group_by('year').all()

        data_map = {int(row.year): int(row.seconds / 60) for row in year_data if row.year}

        bucket_start_dt = datetime(start_year, 1, 1, tzinfo=dt_timezone.utc)
        bucket_end_dt = datetime(end_year, 12, 31, 23, 59, 59, tzinfo=dt_timezone.utc)

        return {"buckets": generate_buckets("alltime", bucket_start_dt, bucket_end_dt, data_map, user_tz)}

    trunc_level = "day" 
    if range_key == "1d":
        trunc_level = "hour"
    elif range_key == "1y":
        trunc_level = "month"

    trunc_expr = func.date_trunc(
        trunc_level, 
        Listen.played_at.op('AT TIME ZONE')('UTC').op('AT TIME ZONE')(timezone)
    )

    agg_results = query.with_entities(
        trunc_expr.label('bucket_time'),
        func.coalesce(func.sum(Track.duration), 0).label('seconds')
    ).group_by(trunc_expr).all()

    data_map = {}
    for row in agg_results:
        if row.bucket_time:
            local_dt = row.bucket_time.replace(tzinfo=user_tz)
            utc_key = local_dt.astimezone(dt_timezone.utc)
            data_map[utc_key] = int(row.seconds / 60)

    buckets = generate_buckets(range_key, start_dt, end_dt, data_map, user_tz)

    return {"buckets": buckets}