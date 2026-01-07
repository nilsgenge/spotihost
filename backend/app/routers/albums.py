from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import Album
from app.schemas import AlbumCreate, AlbumOut
from app.database import get_db

router = APIRouter(prefix="/albums", tags=["albums"])

@router.post("/", response_model=AlbumOut)
def create_album(album: AlbumCreate, db: Session = Depends(get_db)):
    db_album = Album(**album.dict())
    db.add(db_album)
    db.commit()
    db.refresh(db_album)
    return db_album

