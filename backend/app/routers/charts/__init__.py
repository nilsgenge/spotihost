"""
Charts package for Spotify listening statistics.

Provides endpoints for:
- Minutes: Listening time over different time ranges
- Plays: Play counts over time and categorical aggregations  
- Distributions: Skip rate and completion rate pie charts
"""

from fastapi import APIRouter
from .minutes import router as minutes_router
from .plays import router as plays_router
from .distributions import router as distributions_router

router = APIRouter(prefix="/charts", tags=["charts"])

router.include_router(minutes_router)
router.include_router(plays_router)
router.include_router(distributions_router)

__all__ = ["router"]