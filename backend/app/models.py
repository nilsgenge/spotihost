from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Table, DateTime, Date, UniqueConstraint, Index
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

    __table_args__ = (
        Index('ix_artists_name_trgm', 'name', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'}),
    )

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

    __table_args__ = (
        Index('ix_albums_name_trgm', 'name', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'}),
    )

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

    __table_args__ = (
        Index('ix_tracks_name_trgm', 'name', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'}),
    )

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

    import_job_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "import_jobs.id", 
            ondelete="CASCADE", 
            name="fk_listens_import_job_id_import_jobs"
        ), 
        nullable=True, 
        index=True
    )
    import_job: Mapped["ImportJob"] = relationship(back_populates="listens")

    ms_played: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skipped: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    offline: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)
    platform: Mapped[str | None] = mapped_column(String, nullable=True)
    conn_country: Mapped[str | None] = mapped_column(String, nullable=True)
    incognito_mode: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=False)


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    
    total_records: Mapped[int | None] = mapped_column(Integer, nullable=True)
    imported_records: Mapped[int] = mapped_column(Integer, default=0)
    
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    listens: Mapped[list["Listen"]] = relationship(back_populates="import_job")


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