import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal
from app.scheduler import start_scheduler, stop_scheduler, schedule_ingestion
from app.ingestion import get_ingest_interval_minutes
from app.routers import (
    listens, database_stats, top, playing, auth, track,
    album, artist, health, settings, imports, stats, search
)
from app.routers.charts import router as charts_router

app = FastAPI()

# CORS Configuration (only needed in development)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS.split(","),
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


# API Routes
app.include_router(listens.router, prefix="/api")
app.include_router(album.router, prefix="/api")
app.include_router(artist.router, prefix="/api")
app.include_router(database_stats.router, prefix="/api")
app.include_router(track.router, prefix="/api")
app.include_router(top.router, prefix="/api")
app.include_router(playing.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(charts_router, prefix="/api")


# Static File Serving (Production)
SERVE_STATIC = os.getenv("SERVE_STATIC", "false").lower() == "true"
STATIC_DIR = Path("/app/static")

if SERVE_STATIC and STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        """Serve the SPA for all non-API routes."""

        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))

        index_path = STATIC_DIR / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))

        return {"error": "Not found"}