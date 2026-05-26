from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/conflicts")
def get_conflicts():
    return cache.get("conflicts", {"conflicts": [], "total_conflicts": 0})
