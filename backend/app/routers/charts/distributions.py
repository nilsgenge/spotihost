from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Float, case, func
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import Listen, Track
from .utils import apply_entity_filter

router = APIRouter(tags=["charts"])


class PieBucket(BaseModel):
    label: str
    value: int
    percentage: int
    color: Optional[str] = None


class PieChartResponse(BaseModel):
    segments: list[PieBucket]
    total: int


@router.get("/skip-rate", response_model=PieChartResponse)
def get_skip_rate(
    start: str,
    end: str,
    artist_id: Optional[str] = Query(None),
    album_id: Optional[str] = Query(None),
    track_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get skip rate breakdown showing skipped vs full listens.
    Supports filtering by artist, album, or track.
    """
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    # Base query
    query = db.query(Listen).filter(
        Listen.played_at.between(start_dt, end_dt)
    ).join(Track, Listen.track_id == Track.track_id)
    
    query = apply_entity_filter(query, artist_id, album_id, track_id)
    
    # Aggregate skip data
    results = query.with_entities(
        func.sum(case((Listen.skipped == True, 1), else_=0)).label('skipped_count'),
        func.count(Listen.listen_id).label('total')
    ).first()
    
    # Handle no results case
    if not results:
        return PieChartResponse(segments=[], total=0)
    
    # Extract values
    total = int(results.total or 0)
    skipped = int(results.skipped_count or 0)
    full_listen = total - skipped
    
    segments = []
    if skipped > 0:
        segments.append(PieBucket(
            label="Skipped",
            value=skipped,
            percentage=round((skipped / total) * 100) if total > 0 else 0,
            color="#dc2626"
        ))
    if full_listen > 0:
        segments.append(PieBucket(
            label="Full Listen",
            value=full_listen,
            percentage=round((full_listen / total) * 100) if total > 0 else 0,
            color="#22c55e"
        ))
    
    return PieChartResponse(segments=segments, total=total)


@router.get("/completion-rate", response_model=PieChartResponse)
def get_completion_rate(
    start: str,
    end: str,
    artist_id: Optional[str] = Query(None),
    album_id: Optional[str] = Query(None),
    track_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get completion rate distribution.
    Categories: <25%, <50%, <75%, <95%, Full Listen (95%+)
    """
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")
    
    query = db.query(Listen).filter(
        Listen.played_at.between(start_dt, end_dt),
        Listen.ms_played.isnot(None),
        Listen.ms_played > 0,
        Track.duration.isnot(None),
        Track.duration > 0
    ).join(Track, Listen.track_id == Track.track_id)
    
    query = apply_entity_filter(query, artist_id, album_id, track_id)
    
    # Calculate ratio
    ratio = func.least(
        Listen.ms_played.cast(Float) / (Track.duration.cast(Float) * 1000),
        1.0
    )
    
    category_label = case(
        (ratio < 0.25, "<25%"),
        (ratio < 0.50, "<50%"),
        (ratio < 0.75, "<75%"),
        (ratio < 0.95, "<95%"),
        else_="Full Listen"
    )
    
    results = query.with_entities(
        category_label.label('category'),
        func.count(Listen.listen_id).label('count')
    ).group_by(category_label).order_by(
        case(
            (category_label == "<25%", 1),
            (category_label == "<50%", 2),
            (category_label == "<75%", 3),
            (category_label == "<95%", 4),
            (category_label == "Full Listen", 5),
            else_=6
        )
    ).all()
    
    total = sum(int(row.count) for row in results) # type: ignore
    
    segments = []
    for row in results:
        count = int(row.count) # type: ignore
        segments.append(PieBucket(
            label=row.category,
            value=count,
            percentage=round((count / total) * 100) if total > 0 else 0,
            color=None
        ))
    
    return PieChartResponse(segments=segments, total=total)