from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import SearchResponse, SearchResultItem

router = APIRouter(prefix="/search", tags=["search"])

MERGED_SQL = """
    SELECT * FROM (
        SELECT
            a.spotify_id, a.name, a.image_url_small,
            '' AS secondary_info, 'artist' AS type,
            similarity(a.name, :query) AS sim,
            COALESCE(lc.listen_count, 0) AS listen_count
        FROM artists a
        LEFT JOIN LATERAL (
            SELECT COUNT(l.listen_id) AS listen_count
            FROM listens l
            JOIN track_artists ta ON l.track_id = ta.track_id
            WHERE ta.artist_id = a.artist_id
              AND (l.skipped = false OR l.skipped IS NULL)
        ) lc ON true
        WHERE a.name ILIKE :prefix OR a.name % :query

        UNION ALL

        SELECT
            t.spotify_id, t.name, t.image_url_small,
            COALESCE(sa.secondary_info, ''), 'track' AS type,
            similarity(t.name, :query) AS sim,
            COALESCE(lc.listen_count, 0) AS listen_count
        FROM tracks t
        LEFT JOIN LATERAL (
            SELECT string_agg(ar.name, ', ') AS secondary_info
            FROM track_artists ta JOIN artists ar ON ta.artist_id = ar.artist_id
            WHERE ta.track_id = t.track_id
        ) sa ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(l.listen_id) AS listen_count
            FROM listens l
            WHERE l.track_id = t.track_id
              AND (l.skipped = false OR l.skipped IS NULL)
        ) lc ON true
        WHERE t.name ILIKE :prefix OR t.name % :query

        UNION ALL

        SELECT
            al.spotify_id, al.name, al.image_url_small,
            COALESCE(sa.secondary_info, ''), 'album' AS type,
            similarity(al.name, :query) AS sim,
            COALESCE(lc.listen_count, 0) AS listen_count
        FROM albums al
        LEFT JOIN LATERAL (
            SELECT string_agg(ar.name, ', ') AS secondary_info
            FROM album_artists aa JOIN artists ar ON aa.artist_id = ar.artist_id
            WHERE aa.album_id = al.album_id
        ) sa ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(l.listen_id) AS listen_count
            FROM listens l
            JOIN track_album tal ON l.track_id = tal.track_id
            WHERE tal.album_id = al.album_id
              AND (l.skipped = false OR l.skipped IS NULL)
        ) lc ON true
        WHERE al.name ILIKE :prefix OR al.name % :query
    ) combined
    ORDER BY (0.6 * sim + 0.4 * ln(listen_count + 1) / NULLIF(MAX(ln(listen_count + 1)) OVER (), 0)) DESC
    LIMIT 8
"""

MERGED_ILIKE_SQL = """
    SELECT * FROM (
        SELECT
            a.spotify_id, a.name, a.image_url_small,
            '' AS secondary_info, 'artist' AS type,
            0 AS sim,
            COALESCE(lc.listen_count, 0) AS listen_count
        FROM artists a
        LEFT JOIN LATERAL (
            SELECT COUNT(l.listen_id) AS listen_count
            FROM listens l
            JOIN track_artists ta ON l.track_id = ta.track_id
            WHERE ta.artist_id = a.artist_id
              AND (l.skipped = false OR l.skipped IS NULL)
        ) lc ON true
        WHERE a.name ILIKE :like

        UNION ALL

        SELECT
            t.spotify_id, t.name, t.image_url_small,
            COALESCE(sa.secondary_info, ''), 'track' AS type,
            0 AS sim,
            COALESCE(lc.listen_count, 0) AS listen_count
        FROM tracks t
        LEFT JOIN LATERAL (
            SELECT string_agg(ar.name, ', ') AS secondary_info
            FROM track_artists ta JOIN artists ar ON ta.artist_id = ar.artist_id
            WHERE ta.track_id = t.track_id
        ) sa ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(l.listen_id) AS listen_count
            FROM listens l
            WHERE l.track_id = t.track_id
              AND (l.skipped = false OR l.skipped IS NULL)
        ) lc ON true
        WHERE t.name ILIKE :like

        UNION ALL

        SELECT
            al.spotify_id, al.name, al.image_url_small,
            COALESCE(sa.secondary_info, ''), 'album' AS type,
            0 AS sim,
            COALESCE(lc.listen_count, 0) AS listen_count
        FROM albums al
        LEFT JOIN LATERAL (
            SELECT string_agg(ar.name, ', ') AS secondary_info
            FROM album_artists aa JOIN artists ar ON aa.artist_id = ar.artist_id
            WHERE aa.album_id = al.album_id
        ) sa ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(l.listen_id) AS listen_count
            FROM listens l
            JOIN track_album tal ON l.track_id = tal.track_id
            WHERE tal.album_id = al.album_id
              AND (l.skipped = false OR l.skipped IS NULL)
        ) lc ON true
        WHERE al.name ILIKE :like
    ) combined
    ORDER BY listen_count DESC
    LIMIT 8
"""


def _row_to_item(row) -> SearchResultItem:
    return SearchResultItem(
        spotify_id=row.spotify_id,
        name=row.name,
        image_url=row.image_url_small or "",
        type=row.type,
        secondary_info=row.secondary_info,
    )


@router.get("", response_model=SearchResponse)
def search(q: str = Query(..., min_length=2, max_length=100), db: Session = Depends(get_db)):
    query = q.strip()
    prefix = f"{query}%"
    like = f"%{query}%"

    try:
        rows = db.execute(text(MERGED_SQL), {"prefix": prefix, "query": query}).fetchall()
    except Exception:
        rows = db.execute(text(MERGED_ILIKE_SQL), {"like": like}).fetchall()

    items = [_row_to_item(r) for r in rows]
    return SearchResponse(
        tracks=[i for i in items if i.type == "track"],
        artists=[i for i in items if i.type == "artist"],
        albums=[i for i in items if i.type == "album"],
    )
