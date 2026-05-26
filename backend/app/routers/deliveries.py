from fastapi import APIRouter, Query

from app.cache.store import cache

router = APIRouter()


@router.get("/deliveries")
def get_deliveries(
    status: str | None = None,
    campus: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    payload = cache.get("deliveries", {"deliveries": [], "total": 0, "by_status": {}})
    rows = payload["deliveries"]
    if status:
        rows = [row for row in rows if row["status"].lower() == status.lower()]
    if campus:
        rows = [row for row in rows if row["campus"].lower() == campus.lower()]
    return {
        "deliveries": rows[offset : offset + limit],
        "total": len(rows),
        "by_status": payload.get("by_status", {}),
    }


@router.get("/campus-stats")
def get_campus_stats():
    return cache.get("campus_stats", {"campuses": []})
