from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Track
from app.schemas import TrackCreate, TrackOut
from app.database import get_db

router = APIRouter(prefix="/tracks", tags=["tracks"])

@router.post("/", response_model=TrackOut)
def create_track(track: TrackCreate, db: Session = Depends(get_db)):
    """Create a new track."""
    try:
        db_track = Track(spotify_id=track.spotify_id, name=track.name)
        db.add(db_track)
        db.commit()
        db.refresh(db_track)
        return {"track_id": db_track.track_id, "message": "Track created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=list[TrackOut])
def get_tracks(db: Session = Depends(get_db)):
    """Get all tracks."""
    try:
        tracks = db.query(Track).all()
        return tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
