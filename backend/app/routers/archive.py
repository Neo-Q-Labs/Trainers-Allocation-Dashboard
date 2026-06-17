from fastapi import APIRouter, Query

from app.cache.store import cache

router = APIRouter()


@router.get("/archive")
def get_archive(
    campus: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    payload = cache.get("archive", {"records": [], "total": 0})
    records = payload.get("records", [])

    if campus:
        records = [r for r in records if r.get("campus", "").lower() == campus.lower()]
    if status:
        records = [r for r in records if r.get("status", "").lower() == status.lower()]
    if search:
        q = search.lower()
        records = [
            r for r in records
            if q in r.get("delivery_id", "").lower()
            or q in r.get("course_name", "").lower()
            or q in r.get("campus", "").lower()
        ]

    return {
        "records": records[offset: offset + limit],
        "total": len(records),
    }
