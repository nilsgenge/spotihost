from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone as dt_timezone
from app.database import get_db
from app.models import Listen, Track
from .utils import get_local_timezone

router = APIRouter(prefix="/heatmap", tags=["charts"])


@router.get("")
def get_heatmap_data(
    timezone: str = Query("UTC", description="User IANA timezone"),
    db: Session = Depends(get_db),
):
    """Get daily play counts for the last 365 days (GitHub-style heatmap)."""
    user_tz = get_local_timezone(timezone)
    now = datetime.now(tz=dt_timezone.utc)

    # End of today in user's timezone
    local_now = now.astimezone(user_tz)
    end_of_today = local_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    end_utc = end_of_today.astimezone(dt_timezone.utc)

    # Start 365 days ago, snapped back to previous Sunday for clean grid alignment
    start_local = (local_now - timedelta(days=365)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    days_since_sunday = (start_local.weekday() + 1) % 7
    start_local = start_local - timedelta(days=days_since_sunday)
    start_utc = start_local.astimezone(dt_timezone.utc)

    # Aggregate by day in user's timezone
    trunc_expr = func.date_trunc(
        "day", Listen.played_at.op("AT TIME ZONE")(user_tz.key)
    )

    query = (
        db.query(
            trunc_expr.label("day"),
            func.count(Listen.listen_id).label("play_count"),
        )
        .join(Track, Listen.track_id == Track.track_id)
        .filter(
            Listen.played_at.between(start_utc, end_utc),
            (Listen.skipped == False) | (Listen.skipped == None),
        )
        .group_by(trunc_expr)
        .all()
    )

    data_map = {}
    for row in query:
        if row.day:
            date_str = row.day.strftime("%Y-%m-%d")
            data_map[date_str] = row.play_count

    return {
        "days": data_map,
        "start_date": start_local.strftime("%Y-%m-%d"),
        "end_date": local_now.strftime("%Y-%m-%d"),
    }
