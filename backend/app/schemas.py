from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime, timezone

class ArtistBase(BaseModel):
    spotify_id: str
    name: str
    image_url: Optional[str] = None

class ArtistCreate(ArtistBase):
    pass

class ArtistOut(ArtistBase):
    artist_id: int

    class Config:
        from_attributes = True

class AlbumBase(BaseModel):
    spotify_id: str
    name: str
    release_date: Optional[date] = None
    release_date_precision: Optional[str] = None
    album_type: Optional[str] = None
    total_tracks: int = 0
    image_url_small: Optional[str] = None
    image_url_medium: Optional[str] = None
    image_url_large: Optional[str] = None

class AlbumCreate(AlbumBase):
    pass

class AlbumOut(AlbumBase):
    album_id: int

    class Config:
        from_attributes = True

class TrackBase(BaseModel):
    spotify_id: str
    name: str
    duration: Optional[int] = None
    image_url_small: Optional[str] = None
    image_url_medium: Optional[str] = None
    image_url_large: Optional[str] = None

class TrackCreate(TrackBase):
    artist_ids: Optional[List[int]] = []
    album_ids: Optional[List[int]] = []

class TrackOut(TrackBase):
    track_id: int

    class Config:
        from_attributes = True

class ListenCreate(BaseModel):
    track_id: int
    played_at: datetime
    context_type: Optional[str] = None

class ListenOut(BaseModel):
    listen_id: int
    track_id: int
    played_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        }

class RecentListenItem(BaseModel):
    listen_id: int
    track_id: int
    played_at: datetime
    context_type: Optional[str] = None
    track_name: str
    track_duration: int
    cover_url: Optional[str] = None
    artist_names: str

class TopArtist(BaseModel):
    artist_id: int
    name: str
    image_url: str
    listen_count: int

class TopTrack(BaseModel):
    track_id: int
    name: str
    cover_url: str
    listen_count: int
    artist_name: str

class TopAlbum(BaseModel):
    album_id: int
    name: str
    cover_url: str
    listen_count: int
    artist_name: str


