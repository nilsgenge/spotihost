from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, Date, UniqueConstraint
from app.database import Base
from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

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
    __tablename__ = "artists"

    artist_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)

    image_url_small: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url_medium: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url_large: Mapped[str | None] = mapped_column(String, nullable=True)

    tracks: Mapped[list["Track"]] = relationship(
        secondary=track_artists,
        back_populates="artists",
    )

    albums: Mapped[list["Album"]] = relationship(
        secondary=album_artists,
        back_populates="artists",
    )

class Album(Base):
    __tablename__ = "albums"

    album_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)

    release_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    release_date_precision: Mapped[str | None] = mapped_column(String, nullable=True)

    album_type: Mapped[str | None] = mapped_column(String, nullable=True)
    total_tracks: Mapped[int] = mapped_column(Integer, default=0)

    image_url_small: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url_medium: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url_large: Mapped[str | None] = mapped_column(String, nullable=True)

    tracks: Mapped[list["Track"]] = relationship(
        secondary=track_album,
        back_populates="albums",
    )

    artists: Mapped[list["Artist"]] = relationship(
        secondary=album_artists,
        back_populates="albums",
    )

class Track(Base):
    __tablename__ = "tracks"

    track_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    spotify_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)

    image_url_small: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url_medium: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url_large: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: Mapped[list["Artist"]] = relationship(
        secondary=track_artists,
        back_populates="tracks",
    )

    albums: Mapped[list["Album"]] = relationship(
        secondary=track_album,
        back_populates="tracks",
    )


class Listen(Base):
    __tablename__ = "listens"

    __table_args__ = (
        UniqueConstraint(
            "track_id",
            "played_at",
            name="uq_listen_track_played_at",
        ),
    )

    listen_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    track_id: Mapped[int] = mapped_column(
        ForeignKey("tracks.track_id"),
        nullable=False,
    )
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    context_type: Mapped[str | None] = mapped_column(String, nullable=True)

    track: Mapped["Track"] = relationship()


class SpotifyToken(Base):
    __tablename__ = 'spotify_tokens'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    access_token: Mapped[str] = mapped_column(String, nullable=False)
    refresh_token: Mapped[str] = mapped_column(String, nullable=False)
    token_type: Mapped[str] = mapped_column(String, default="Bearer")
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Setting(Base):
    __tablename__ = "settings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    default_value: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, 
        server_default=func.now(), 
        onupdate=func.now(),
        nullable=True
    )