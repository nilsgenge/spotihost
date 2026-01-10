from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

track_album = Table(
    'track_album',
    Base.metadata,
    Column('track_id', ForeignKey('tracks.track_id'), primary_key=True),
    Column('album_id', ForeignKey('albums.album_id'), primary_key=True)
)

track_artists = Table(
    'track_artists',
    Base.metadata,
    Column('track_id', ForeignKey('tracks.track_id'), primary_key=True),
    Column('artist_id', ForeignKey('artists.artist_id'), primary_key=True)
)

album_artists = Table(
    'album_artists',
    Base.metadata,
    Column('album_id', ForeignKey('albums.album_id'), primary_key=True),
    Column('artist_id', ForeignKey('artists.artist_id'), primary_key=True)
)

class Artist(Base):
    __tablename__ = 'artists'

    artist_id = Column(Integer, primary_key=True, index=True)
    spotify_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    
    image_url_small = Column(String, nullable=True)
    image_url_medium = Column(String, nullable=True)
    image_url_large = Column(String, nullable=True)

    tracks = relationship("Track", secondary="track_artists", back_populates="artists")
    albums = relationship("Album", secondary="album_artists", back_populates="artists")

class Album(Base):
    __tablename__ = 'albums'

    album_id = Column(Integer, primary_key=True, index=True)
    spotify_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    
    release_date = Column(Date, nullable=True)
    release_date_precision = Column(String, nullable=True)
    
    album_type = Column(String, nullable=True) 
    total_tracks = Column(Integer, default=0)
    
    image_url_small = Column(String, nullable=True)
    image_url_medium = Column(String, nullable=True)
    image_url_large = Column(String, nullable=True)

    tracks = relationship("Track", secondary=track_album, back_populates="albums")
    artists = relationship("Artist", secondary=album_artists, back_populates="albums")

class Track(Base):
    __tablename__ = 'tracks'

    track_id = Column(Integer, primary_key=True, index=True)
    spotify_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    duration = Column(Integer, nullable=True)
    
    image_url_small = Column(String, nullable=True)
    image_url_medium = Column(String, nullable=True)
    image_url_large = Column(String, nullable=True)

    artists = relationship("Artist", secondary=track_artists, back_populates="tracks")
    albums = relationship("Album", secondary=track_album, back_populates="tracks")

class Listen(Base):
    __tablename__ = 'listens'

    __table_args__ = (
        UniqueConstraint(
            "track_id",
            "played_at",
            name="uq_listen_track_played_at"
        ),
    )

    listen_id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey('tracks.track_id'), nullable=False)
    played_at = Column(DateTime(timezone=True), nullable=False)
    context_type = Column(String, nullable=True)

    track = relationship("Track")

class SpotifyToken(Base):
    __tablename__ = 'spotify_tokens'

    id = Column(Integer, primary_key=True, index=True)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    token_type = Column(String, default="Bearer")
    expires_at = Column(DateTime, nullable=False)