from datetime import timezone
import logging
from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import os
from fastapi.middleware.cors import CORSMiddleware

from app.ingestion import ingest_recent_listens
from app.routers import listens, albums, artists, database_stats, timezone, tracks, top, playing, auth

app = FastAPI()

INGEST_INTERVAL_MINUTES = int(os.getenv("INGEST_INTERVAL_MINUTES", "10"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS.split(",") if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

scheduler = BackgroundScheduler()

@app.on_event("startup")
def startup_event():
    logger = logging.getLogger("uvicorn")
    logger.info("Starting Scheduler...")
    
    scheduler.add_job(
        func=ingest_recent_listens,
        trigger=IntervalTrigger(minutes=INGEST_INTERVAL_MINUTES),
        id='spotify_ingest_job',
        name='Ingest Spotify Listens',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info(f"Scheduler started. Ingesting every {INGEST_INTERVAL_MINUTES} minutes.")

@app.on_event("shutdown")
def shutdown_event():
    logger = logging.getLogger("uvicorn")
    logger.info("Stopping Scheduler...")
    scheduler.shutdown()

app.include_router(listens.router)
app.include_router(albums.router)
app.include_router(artists.router)
app.include_router(database_stats.router)
app.include_router(timezone.router)
app.include_router(tracks.router)
app.include_router(top.router)
app.include_router(playing.router)
app.include_router(auth.router)

