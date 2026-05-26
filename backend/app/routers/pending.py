from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/pending-allocations")
def get_pending():
    return cache.get("pending", {"kpis": {}, "slots": []})
