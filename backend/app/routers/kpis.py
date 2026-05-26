from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/kpis")
def get_kpis():
    return cache.get("kpis", {})
