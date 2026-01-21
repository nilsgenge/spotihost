from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = BackgroundScheduler()

def schedule_ingestion(minutes: int):
    scheduler.add_job(
        func="app.ingestion:ingest_recent_listens",
        trigger=IntervalTrigger(minutes=minutes),
        id="spotify_ingest_job",
        replace_existing=True,
    )

def reschedule_ingestion(minutes: int):
    scheduler.reschedule_job(
        "spotify_ingest_job",
        trigger=IntervalTrigger(minutes=minutes)
    )
