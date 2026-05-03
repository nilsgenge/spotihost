from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from app.database import get_db
from datetime import datetime, timezone
from app.schemas import ArtistLink, ListenCreate, SimpleListen, SimpleListenResponse
from app.models import Listen, Track, Artist
from app.routers.charts.utils import get_local_timezone
from zoneinfo import ZoneInfo

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

@router.get("/recent", response_model=SimpleListenResponse)
def get_recent_listens(
    limit: int = Query(50, ge=1, le=500),
    timezone_name: str = Query("UTC", description="User IANA timezone"),
    db: Session = Depends(get_db)
):
    """Get the most recent non-skipped listens from today with track and artist info."""
    try:
        user_tz = get_local_timezone(timezone_name)

        # We use AT TIME ZONE to convert UTC stored times to user's local time
        now_utc = datetime.now(timezone.utc)

        today_local_midnight = now_utc.astimezone(user_tz).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        listens = (
            db.query(Listen)
            .filter((Listen.skipped == False) | (Listen.skipped == None))
            .filter(Listen.played_at >= today_local_midnight)
            .options(joinedload(Listen.track).selectinload(Track.artists))
            .order_by(Listen.played_at.desc())
            .limit(limit)
            .all()
        )

        formatted_listens = []
        for listen in listens:
            track = listen.track
            
            if not track:
                continue

            artists_info = []
            if track.artists:
                artists_info = [
                    ArtistLink(
                        name=artist.name, 
                        url=f"/artist/{artist.spotify_id}"
                    )
                    for artist in track.artists
                ]

            formatted_listens.append(
                SimpleListen(
                    listen_id=listen.listen_id,
                    track_id=listen.track_id,
                    track_spotify_id=track.spotify_id,
                    played_at=listen.played_at.isoformat(),
                    track_name=track.name,
                    cover_url=track.image_url_small,
                    artists=artists_info
                )
            )

        return SimpleListenResponse(listens=formatted_listens)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")