import logging
from fastapi import FastAPI
import os
from app.database import SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from app.scheduler import start_scheduler, stop_scheduler, schedule_ingestion
from app.ingestion import get_ingest_interval_minutes
from app.routers import listens, database_stats, top, playing, auth, track, album, artist, health, settings

app = FastAPI()

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS.split(",") if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        ingest_interval = get_ingest_interval_minutes(db)
    finally:
        db.close()
    
    schedule_ingestion(ingest_interval)
    start_scheduler()


@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()


app.include_router(listens.router)
app.include_router(album.router)
app.include_router(artist.router)
app.include_router(database_stats.router)
app.include_router(track.router)
app.include_router(top.router)
app.include_router(playing.router)
app.include_router(auth.router)
app.include_router(health.router)
app.include_router(settings.router)