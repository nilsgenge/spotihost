from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models import Listen, Track, Artist, track_artists

router = APIRouter(prefix="/stats", tags=["stats"])

class CountResponse(BaseModel):
    plays_count: int

class StreakResponse(BaseModel):
    streak: int

class MinutesResponse(BaseModel):
    minutes_listened: int

class ArtistCountResponse(BaseModel):
    artist_count: int

def parse_date_range(start: str, end: str):
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        return start_dt, end_dt
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601.")

@router.get("/count", response_model=CountResponse)
def get_listens_count(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    db: Session = Depends(get_db)
):
    """Count non-skipped listens in a time range."""
    start_dt, end_dt = parse_date_range(start, end)
    
    count = db.query(Listen).filter(
        Listen.played_at.between(start_dt, end_dt),
        Listen.skipped == False
    ).count()
    
    return CountResponse(plays_count=count)

@router.get("/streak", response_model=StreakResponse)
def get_listening_streak(db: Session = Depends(get_db)):
    """
    Calculate current listening streak (consecutive days with listens).
    Streak breaks if gap > 1 day.
    """
    try:
        dates = db.query(
            func.date(Listen.played_at).label('listen_date')
        ).distinct().order_by(
            func.date(Listen.played_at).desc()
        ).all()
        
        if not dates:
            return StreakResponse(streak=0)
        
        unique_dates = [d.listen_date for d in dates]
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        
        streak = 0
        
        # Check if listened today or yesterday to have an active streak
        if unique_dates[0] in (today, yesterday):
            streak = 1
            for i in range(len(unique_dates) - 1):
                if unique_dates[i] - unique_dates[i+1] == timedelta(days=1):
                    streak += 1
                else:
                    break
        
        return StreakResponse(streak=streak)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/minutes", response_model=MinutesResponse)
def get_total_minutes(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db)
):
    """Total minutes listened in time range (excluding skips)."""
    start_dt, end_dt = parse_date_range(start, end)
    
    total_seconds = db.query(
        func.sum(Track.duration)
    ).join(
        Listen, Listen.track_id == Track.track_id
    ).filter(
        Listen.played_at.between(start_dt, end_dt),
        Listen.skipped == False
    ).scalar()
    
    total_seconds = total_seconds or 0
    
    return MinutesResponse(minutes_listened=int(total_seconds // 60))

@router.get("/artists", response_model=ArtistCountResponse)
def get_unique_artist_count(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db)
):
    """Count unique artists listened to in time range."""
    start_dt, end_dt = parse_date_range(start, end)
    
    count = db.query(
        func.count(func.distinct(Artist.artist_id))
    ).join(
        track_artists, Artist.artist_id == track_artists.c.artist_id
    ).join(
        Track, Track.track_id == track_artists.c.track_id
    ).join(
        Listen, Listen.track_id == Track.track_id
    ).filter(
        Listen.played_at.between(start_dt, end_dt)
    ).scalar()
    
    return ArtistCountResponse(artist_count=count or 0)
