from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/availability")
def get_availability():
    return cache.get("availability", {"days": [], "trainers": [], "grid": []})
