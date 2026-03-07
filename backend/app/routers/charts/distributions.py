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
        func.sum(case((Listen.skipped == False, 1), else_=0)).label('full_listen_count'),
        func.sum(case((Listen.skipped.is_(None), 1), else_=0)).label('unknown_count'),
        func.count(Listen.listen_id).label('total')
    ).first()

    # Handle no results case
    if not results:
        return PieChartResponse(segments=[], total=0)

    # Extract values
    total = int(results.total or 0)
    skipped = int(results.skipped_count or 0)
    full_listen = int(results.full_listen_count or 0)
    unknown_count = int(results.unknown_count or 0)

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

    # Unknown category
    if unknown_count > 0:
        segments.append(PieBucket(
            label="Unknown",
            value=unknown_count,
            percentage=round((unknown_count / total) * 100) if total > 0 else 0,
            color="#76787c"
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
        Listen.played_at.between(start_dt, end_dt)
    ).join(Track, Listen.track_id == Track.track_id)

    query = apply_entity_filter(query, artist_id, album_id, track_id)

    # Count listens without ms_played data (unknown)
    unknown_query = query.filter(
        (Listen.ms_played.is_(None)) | (Listen.ms_played == 0) |
        (Track.duration.is_(None)) | (Track.duration == 0)
    )
    unknown_count = unknown_query.count()

    # Get total count
    total_count = query.count()

    # Query for listens with duration data
    query = query.filter(
        Listen.ms_played.isnot(None),
        Listen.ms_played > 0,
        Track.duration.isnot(None),
        Track.duration > 0
    )
    
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

    # Count listens with completion data
    known_total = sum(int(row.count) for row in results) # type: ignore

    segments = []
    for row in results:
        count = int(row.count) # type: ignore
        segments.append(PieBucket(
            label=row.category,
            value=count,
            percentage=round((count / total_count) * 100) if total_count > 0 else 0,
            color=None
        ))

    # Add unknown category for listens without ms_played data
    if unknown_count > 0:
        unknown_percentage = round((unknown_count / total_count) * 100) if total_count > 0 else 0
        segments.append(PieBucket(
            label="Unknown",
            value=unknown_count,
            percentage=unknown_percentage,
            color="#76787c"
        ))

    return PieChartResponse(segments=segments, total=total_count)


@router.get("/platform", response_model=PieChartResponse)
def get_platform_distribution(
    start: str,
    end: str,
    artist_id: Optional[str] = Query(None),
    album_id: Optional[str] = Query(None),
    track_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get platform distribution breakdown.
    Categories are dynamically generated based on platform strings found in the data.
    """
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")

    query = db.query(Listen).filter(
        Listen.played_at.between(start_dt, end_dt)
    ).join(Track, Listen.track_id == Track.track_id)

    query = apply_entity_filter(query, artist_id, album_id, track_id)

    # Count listens without platform data
    unknown_query = query.filter(Listen.platform.is_(None))
    unknown_count = unknown_query.count()

    # Get total count
    total_count = query.count()

    # Query for listens with platform data
    query = query.filter(Listen.platform.isnot(None))

    unique_platforms = query.with_entities(Listen.platform).distinct().all()
    platform_strings = [p[0].lower() for p in unique_platforms if p[0]]

    group_mapping: dict[str, str] = {}
    matched_patterns: dict[str, list[str]] = {"ios": [], "windows": [], "mobile": [], "android": []}

    # First pass: identify which patterns exist in the data
    for platform_str in platform_strings:
        if "ios" in platform_str:
            matched_patterns["ios"].append(platform_str)
        if "windows" in platform_str:
            matched_patterns["windows"].append(platform_str)
        if "android" in platform_str:
            matched_patterns["android"].append(platform_str)
        if "mobile" in platform_str:
            matched_patterns["mobile"].append(platform_str)

    # Build mapping: platforms that match a pattern get grouped
    for platform_str in platform_strings:
        original_platform = next(p[0] for p in unique_platforms if p[0] and p[0].lower() == platform_str)

        if "ios" in platform_str:
            group_mapping[original_platform] = "IOS"
        elif "windows" in platform_str:
            group_mapping[original_platform] = "Windows"
        elif "android" in platform_str:
            group_mapping[original_platform] = "Androit"
        elif "mobile" in platform_str:
            group_mapping[original_platform] = "Mobile"
        else:
            group_mapping[original_platform] = original_platform

    case_conditions = []
    for platform, category in group_mapping.items():
        case_conditions.append((Listen.platform == platform, category))

    if not case_conditions:
        if unknown_count > 0:
            unknown_percentage = 100
            return PieChartResponse(
                segments=[PieBucket(
                    label="Unknown",
                    value=unknown_count,
                    percentage=unknown_percentage,
                    color="#76787c"
                )],
                total=total_count
            )
        return PieChartResponse(segments=[], total=total_count)

    category_label = case(*case_conditions)

    results = query.with_entities(
        category_label.label('category'),
        func.count(Listen.listen_id).label('count')
    ).group_by(category_label).order_by(
        func.count(Listen.listen_id).asc()
    ).all()

    segments = []
    for row in results:
        count = int(row.count) # type: ignore
        percentage = round((count / total_count) * 100) if total_count > 0 else 0
        # Only include categories with more than 1% of listens
        if percentage > 1:
            segments.append(PieBucket(
                label=row.category,
                value=count,
                percentage=percentage,
                color=None
            ))

    # Add unknown category for listens without platform data
    if unknown_count > 0:
        unknown_percentage = round((unknown_count / total_count) * 100) if total_count > 0 else 0
        segments.append(PieBucket(
            label="Unknown",
            value=unknown_count,
            percentage=unknown_percentage,
            color="#76787c"
        ))

    return PieChartResponse(segments=segments, total=total_count)


@router.get("/context", response_model=PieChartResponse)
def get_context_distribution(
    start: str,
    end: str,
    artist_id: Optional[str] = Query(None),
    album_id: Optional[str] = Query(None),
    track_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get listening context distribution.
    Categories: Playlist, Album, Artist, Unknown
    """
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
    except ValueError:
        raise HTTPException(400, detail="Invalid date format")

    query = db.query(Listen).filter(
        Listen.played_at.between(start_dt, end_dt)
    ).join(Track, Listen.track_id == Track.track_id)

    query = apply_entity_filter(query, artist_id, album_id, track_id)

    # Count listens without context data
    unknown_query = query.filter(Listen.context_type.is_(None))
    unknown_count = unknown_query.count()

    # Get total count
    total_count = query.count()

    # Query for listens with context data
    query = query.filter(Listen.context_type.isnot(None))

    # Classify contexts
    category_label = case(
        (Listen.context_type.ilike("%playlist%"), "Playlist"),
        (Listen.context_type.ilike("%album%"), "Album"),
        (Listen.context_type.ilike("%artist%"), "Artist"),
        (Listen.context_type.ilike("%track%"), "Track"),
        (Listen.context_type.ilike("%collection%"), "Collection"),
        else_=Listen.context_type
    )

    results = query.with_entities(
        category_label.label('category'),
        func.count(Listen.listen_id).label('count')
    ).group_by(category_label).order_by(
        func.count(Listen.listen_id).asc()
    ).all()

    segments = []
    for row in results:
        count = int(row.count) # type: ignore
        segments.append(PieBucket(
            label=row.category,
            value=count,
            percentage=round((count / total_count) * 100) if total_count > 0 else 0,
            color=None
        ))

    # Add unknown category for listens without context data
    if unknown_count > 0:
        unknown_percentage = round((unknown_count / total_count) * 100) if total_count > 0 else 0
        segments.append(PieBucket(
            label="Unknown",
            value=unknown_count,
            percentage=unknown_percentage,
            color="#76787c"
        ))

    return PieChartResponse(segments=segments, total=total_count)