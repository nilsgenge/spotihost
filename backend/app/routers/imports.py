import hashlib
import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from app.database import get_db
from app.models import ImportJob, Listen
from app.ingestion import process_import_job

router = APIRouter(prefix="/imports", tags=["imports"])

logger = logging.getLogger(__name__)

# Temporary upload directory
UPLOAD_DIR = "temp_imports"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def calculate_file_hash_streaming(file_path: str, chunk_size: int = 8192) -> str:
    """
    Calculate MD5 hash of file using streaming to avoid loading entire file into memory.
    Critical for large Spotify export files (100MB+).
    """
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Upload a JSON file for import. Creates ImportJob and starts background processing.
    
    Returns:
        - job_id: ID to poll for progress
        - message: Confirmation message
    """
    # Validate file type
    if not file.filename or not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    # Save to disk
    file_location = os.path.join(UPLOAD_DIR, f"{datetime.now().timestamp()}_{file.filename}")
    
    try:
        with open(file_location, "wb") as f:
            while content := await file.read(1024 * 1024):
                f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Calculate hash
    try:
        file_hash = calculate_file_hash_streaming(file_location)
    except Exception as e:
        os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Failed to calculate file hash: {str(e)}")
    
    # Check for duplicate imports
    existing_job = db.query(ImportJob).filter(ImportJob.file_hash == file_hash).first()
    if existing_job:
        os.remove(file_location)
        raise HTTPException(
            status_code=400, 
            detail=f"This file was already imported (Job ID: {existing_job.id})"
        )
    
    # Create import job
    new_job = ImportJob(
        filename=file.filename or "unknown.json",
        file_hash=file_hash,
        status="pending",
        total_records=0,
        imported_records=0
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    # Start processing
    background_tasks.add_task(process_import_job, new_job.id, file_location)
    
    return {
        "message": "Import started successfully",
        "job_id": new_job.id,
        "filename": new_job.filename
    }


@router.get("/jobs")
def get_import_jobs(db: Session = Depends(get_db)):
    """
    Get all import jobs, sorted by creation date (newest first).
    
    Returns list of ImportJob objects with:
        - id, filename, status, total_records, imported_records
        - error_message, started_at, completed_at, created_at
    """
    jobs = db.query(ImportJob).order_by(ImportJob.created_at.desc()).all()
    return jobs


@router.get("/jobs/{job_id}")
def get_import_job(job_id: int, db: Session = Depends(get_db)):
    """
    Get specific import job by ID. Used for progress polling.
    
    Returns:
        ImportJob object with current status and progress
    """
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/jobs/{job_id}")
def delete_import_job(job_id: int, db: Session = Depends(get_db)):
    """
    Delete import job and all associated listens.
    
    Manually deletes listens to ensure data consistency regardless of DB constraints.
    Only delete jobs with status 'completed' or 'failed'.
    """
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Prevent deletion of running jobs
    if job.status in ["pending", "processing"]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete job while it's running. Wait for completion or failure."
        )
    
    try:
        deleted_count = db.query(Listen).filter(
            Listen.import_job_id == job_id
        ).delete(synchronize_session=False)
        
        logger.info(f"Deleting job {job_id}: Manually removed {deleted_count} listens.") # type: ignore

        db.delete(job)
        db.commit()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting job {job_id}: {e}") # type: ignore
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")
    
    # Store filename for cleanup
    filename_pattern = f"*_{job.filename}"
    
    # Clean up file from disk
    try:
        for filename in os.listdir(UPLOAD_DIR):
            if filename.endswith(job.filename):
                file_path = os.path.join(UPLOAD_DIR, filename)
                os.remove(file_path)
    except Exception as e:
        print(f"Warning: Could not delete file for job {job_id}: {e}")
    
    return {
        "message": "Job and associated data deleted successfully",
        "deleted_job_id": job_id,
        "deleted_listens_count": deleted_count
    }


@router.post("/jobs/{job_id}/retry")
def retry_import_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Retry a failed import job.
    
    Only works for jobs with status 'failed'.
    Resets the job and restarts processing.
    """
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "failed":
        raise HTTPException(
            status_code=400, 
            detail=f"Can only retry failed jobs. Current status: {job.status}"
        )
    
    # Find the original file
    file_path = None
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(job.filename):
            file_path = os.path.join(UPLOAD_DIR, filename)
            break
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail="Original file not found. Cannot retry import."
        )
    
    # Reset job status
    job.status = "pending"
    job.error_message = None
    job.imported_records = 0
    job.total_records = 0
    job.started_at = None
    job.completed_at = None
    db.commit()
    
    # Restart processing
    background_tasks.add_task(process_import_job, job.id, file_path)
    
    return {
        "message": "Import job restarted",
        "job_id": job.id
    }


@router.get("/stats")
def get_import_stats(db: Session = Depends(get_db)):
    """
    Get statistics about all imports.
    
    Returns:
        - total_jobs: Total number of import jobs
        - completed_jobs: Number of successfully completed jobs
        - failed_jobs: Number of failed jobs
        - processing_jobs: Number of currently processing jobs
        - total_records_imported: Total number of listen records imported
    """
    from sqlalchemy import func
    
    total_jobs = db.query(func.count(ImportJob.id)).scalar()
    completed_jobs = db.query(func.count(ImportJob.id)).filter(ImportJob.status == "completed").scalar()
    failed_jobs = db.query(func.count(ImportJob.id)).filter(ImportJob.status == "failed").scalar()
    processing_jobs = db.query(func.count(ImportJob.id)).filter(
        ImportJob.status.in_(["pending", "processing"])
    ).scalar()
    
    total_records = db.query(func.sum(ImportJob.imported_records)).filter(
        ImportJob.status == "completed"
    ).scalar() or 0
    
    return {
        "total_jobs": total_jobs or 0,
        "completed_jobs": completed_jobs or 0,
        "failed_jobs": failed_jobs or 0,
        "processing_jobs": processing_jobs or 0,
        "total_records_imported": total_records
    }