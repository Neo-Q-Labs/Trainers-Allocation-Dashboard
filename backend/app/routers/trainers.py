from fastapi import APIRouter, Query

from app.cache.store import cache

router = APIRouter()


@router.get("/trainers")
def get_trainers(
    campus: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    payload = cache.get("trainers", {"headers": [], "trainers": [], "total": 0})
    trainers = payload.get("trainers", [])

    if campus:
        trainers = [t for t in trainers if t.get("campus", "").lower() == campus.lower()]
    if status:
        trainers = [t for t in trainers if t.get("status", "").lower() == status.lower()]
    if search:
        q = search.lower()
        trainers = [
            t for t in trainers
            if q in t.get("name", "").lower()
            or q in t.get("email", "").lower()
            or q in t.get("skills", "").lower()
            or q in t.get("campus", "").lower()
        ]

    return {
        "headers": payload.get("headers", []),
        "trainers": trainers[offset: offset + limit],
        "total": len(trainers),
    }


@router.get("/trainers/{name}")
def get_trainer(name: str):
    payload = cache.get("trainers", {"headers": [], "trainers": [], "total": 0})
    trainers = payload.get("trainers", [])
    match = next((t for t in trainers if t.get("name", "").lower() == name.lower()), None)
    if not match:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Trainer '{name}' not found")
    return match
