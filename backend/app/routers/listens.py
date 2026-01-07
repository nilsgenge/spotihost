from fastapi import APIRouter, Depends, HTTPException, Query, logger
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from datetime import datetime, timedelta
from app.schemas import ListenCreate
from app.models import Listen, Track, Artist, track_artists

router = APIRouter(prefix="/listens", tags=["listens"])

@router.post("/")
def create_listen(listen: ListenCreate, db: Session = Depends(get_db)):
    """Log a new listen manually."""
    try:
        db_listen = Listen(track_id=listen.track_id, played_at=listen.played_at)
        db.add(db_listen)
        db.commit()
        db.refresh(db_listen)
        return {"listen_id": db_listen.listen_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/count")
def get_listens_count(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    db: Session = Depends(get_db)
):
    """Count listens in a time range."""
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        plays_count = db.query(Listen).filter(
            Listen.played_at.between(start_datetime, end_datetime)
        ).count()

        return {"plays_count": plays_count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent")
def get_recent_listens(
    limit: int = Query(50, ge=1, le=500), 
    db: Session = Depends(get_db)
):
    """Get the most recent listens with track and artist info."""
    try:
        listens = (
            db.query(Listen)
            .options(joinedload(Listen.track).selectinload(Track.artists))
            .order_by(Listen.played_at.desc())
            .limit(limit)
            .all()
        )

        formatted_listens = []
        for listen in listens:
            track = listen.track
            track_name = track.name if track else "Unknown Track"
            cover_url = track.image_url_large
            
            artist_names = "Unknown Artist"
            if track and track.artists:
                artist_names = ", ".join(artist.name for artist in track.artists)

            formatted_listens.append({
                "listen_id": listen.listen_id,
                "track_id": listen.track_id,
                "played_at": listen.played_at.isoformat(), 
                "track_name": track_name,
                "artist_names": artist_names,
                "cover_url": cover_url,
            })

        return {"listens": formatted_listens}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
@router.get("/streak")
def get_listening_streak(db: Session = Depends(get_db)):
    """
    Optimized streak calculation.
    Fetches all distinct dates in one query, then calculates streak in Python.
    """
    try:
        dates = db.query(
            func.date(Listen.played_at).label('listen_date')
        ).distinct().order_by(
            func.date(Listen.played_at).desc()
        ).all()

        if not dates:
            return {"streak": 0}

        unique_dates = [d.listen_date for d in dates]
        
        current_streak = 0
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)

        if unique_dates[0] == today or unique_dates[0] == yesterday:
            current_streak = 1
            for i in range(len(unique_dates) - 1):
                if unique_dates[i] - unique_dates[i+1] == timedelta(days=1):
                    current_streak += 1
                else:
                    break
        
        return {"streak": current_streak}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity")
def get_activity_stats(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Returns minutes listened grouped by HOUR.
    The frontend handles aggregating these hours into days, weeks, or months.
    This solves timezone alignment issues.
    """
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)

        # Always group by Hour for maximum granularity
        truncated_time = func.date_trunc('hour', Listen.played_at).label('timestamp')

        results = db.query(
            truncated_time,
            func.sum(Track.duration).label('total_seconds')
        ).join(
            Track, Listen.track_id == Track.track_id
        ).filter(
            Listen.played_at.between(start_dt, end_dt)
        ).group_by(
            truncated_time
        ).order_by(
            truncated_time
        ).all()

        data = [
            {
                # Send raw ISO time
                "timestamp": r.timestamp.isoformat(),
                "minutes": int(r.total_seconds / 60) if r.total_seconds else 0
            }
            for r in results
        ]
        
        return {"activity": data}
    except Exception as e:
        logger.error(f"Error fetching activity: {e}") # type: ignore
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/minutes")
def get_minutes_listened(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        total_duration_seconds = db.query(Listen, Track).join(
            Track, Listen.track_id == Track.track_id
        ).filter(
            Listen.played_at.between(start_datetime, end_datetime)
        ).with_entities(func.sum(Track.duration)).scalar() or 0

        return {"minutes_listened": int(total_duration_seconds // 60)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@router.get("/artists")
def get_listened_artists(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    db: Session = Depends(get_db)
):
    """
    Count unique artists listened to in a time range.
    Matches the frontend useListenedArtists hook.
    """
    try:
        start_datetime = datetime.fromisoformat(start)
        end_datetime = datetime.fromisoformat(end)

        # Join: Listen -> Track -> track_artists (association) -> Artist
        # Count distinct Artist IDs found in this range
        artist_count = db.query(func.count(func.distinct(Artist.artist_id))).join(
            track_artists, Artist.artist_id == track_artists.c.artist_id
        ).join(
            Track, Track.track_id == track_artists.c.track_id
        ).join(
            Listen, Listen.track_id == Track.track_id
        ).filter(
            Listen.played_at.between(start_datetime, end_datetime)
        ).scalar()

        return {"artist_count": artist_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))