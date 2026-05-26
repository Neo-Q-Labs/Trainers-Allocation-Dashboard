from fastapi import APIRouter, Query

from app.cache.store import cache

router = APIRouter()


@router.get("/request-track")
def get_request_track(
    search: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    payload = cache.get("request_track", {"headers": [], "rows": []})
    rows = payload.get("rows", [])

    if search:
        q = search.lower()
        rows = [
            r for r in rows
            if any(q in str(v).lower() for v in r.values())
        ]

    return {
        "headers": payload.get("headers", []),
        "rows": rows[offset: offset + limit],
        "total": len(rows),
    }
