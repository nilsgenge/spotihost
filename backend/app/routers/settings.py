from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel
from app.models import Setting
from app.database import get_db
from app.scheduler import reschedule_ingestion

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingUpdate(BaseModel):
    value: str


class SettingResponse(BaseModel):
    key: str
    value: str
    type: str
    description: str | None
    default_value: str | None


@router.get("/", response_model=Dict[str, Any])
async def get_all_settings(db: Session = Depends(get_db)): 
    """Get all settings as a dictionary"""
    settings = db.query(Setting).all()
    return {
        s.key: {
            "value": s.value,
            "type": s.type,
            "description": s.description,
            "default_value": s.default_value
        }
        for s in settings
    }


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(key: str, db: Session = Depends(get_db)):
    """Get a specific setting by key"""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return setting


@router.put("/{key}")
async def update_setting(key: str, update: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    if setting.type == "number":
        try:
            int(update.value)
        except ValueError:
            raise HTTPException(status_code=400, detail="Value must be a number")

    setting.value = update.value
    db.commit()
    db.refresh(setting)

    if key == "ingest_interval_minutes":
        reschedule_ingestion(int(setting.value))

    return {
        "key": setting.key,
        "value": setting.value,
        "type": setting.type,
        "message": "Setting updated successfully"
    }


@router.post("/{key}/reset")
async def reset_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    if not setting.default_value:
        raise HTTPException(status_code=400, detail="Setting has no default value")

    setting.value = setting.default_value
    db.commit()
    db.refresh(setting)

    if key == "ingest_interval_minutes":
        reschedule_ingestion(int(setting.value))

    return {
        "key": setting.key,
        "value": setting.value,
        "message": "Setting reset to default"
    }

