from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone
from typing import Dict, Any
import time

from app.database import get_db

router = APIRouter(tags=["health"])

@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Comprehensive health check for backend and database.
    Returns 200 if all healthy, 503 if any component is unhealthy.
    """
    response = {
        "status": "healthy",
        "checks": {
            "backend": {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "database": {
                "status": "unknown",
                "latency_ms": None
            }
        }
    }
    
    # Check database connectivity
    try:
        start_time = time.time()
        db.execute(text("SELECT 1"))
        latency = round((time.time() - start_time) * 1000, 2)
        
        response["checks"]["database"]["status"] = "healthy"
        response["checks"]["database"]["latency_ms"] = latency
    except SQLAlchemyError as e:
        response["status"] = "unhealthy"
        response["checks"]["database"]["status"] = "unhealthy"
        response["checks"]["database"]["error"] = str(e)
        
        # Return 503 Service Unavailable if database is down
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response
        ) # type: ignore
    except Exception as e:
        response["status"] = "unhealthy"
        response["checks"]["database"]["status"] = "unhealthy"
        response["checks"]["database"]["error"] = f"Unexpected error: {str(e)}"
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response
        ) # type: ignore
    
    return response