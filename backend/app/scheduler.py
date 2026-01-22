from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging
from app.ingestion import ingest_recent_listens

logger = logging.getLogger("uvicorn")

scheduler = BackgroundScheduler()


def schedule_ingestion(minutes: int):
    """Schedule the ingestion job"""
    logger.info(f"Scheduling ingestion job to run every {minutes} minutes...")
    
    scheduler.add_job(
        func=ingest_recent_listens,
        trigger=IntervalTrigger(minutes=minutes),
        id="spotify_ingest_job",
        replace_existing=True,
    )
    
    logger.info(f"Ingestion job scheduled successfully.")


def reschedule_ingestion(minutes: int):
    """Reschedule the ingestion job with new interval"""
    logger.info(f"Rescheduling ingestion job to run every {minutes} minutes...")
    
    scheduler.reschedule_job(
        "spotify_ingest_job",
        trigger=IntervalTrigger(minutes=minutes)
    )
    
    logger.info(f"Ingestion job rescheduled successfully.")


def start_scheduler():
    """Start the scheduler"""
    logger.info("Starting scheduler...")
    scheduler.start()
    logger.info("Scheduler started successfully.")


def stop_scheduler():
    """Stop the scheduler"""
    logger.info("Stopping scheduler...")
    scheduler.shutdown()
    logger.info("Scheduler stopped successfully.")