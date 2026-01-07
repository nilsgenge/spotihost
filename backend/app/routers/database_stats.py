from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db, Base
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/database-stats")
def get_database_stats(db: Session = Depends(get_db)):
    """
    Returns the total number of rows across ALL tables in the database.
    Includes association tables (e.g., track_artists).
    """
    try:
        total_entries = 0
        
        # Iterate through every table defined in Base.metadata
        for table in Base.metadata.tables.values():
            # Query count for this specific table
            count = db.query(func.count()).select_from(table).scalar()
            total_entries += count

        return {"total_entries": total_entries}

    except Exception as e:
        logger.error(f"Error calculating database stats: {e}")
        raise HTTPException(status_code=500, detail="Could not calculate database size")