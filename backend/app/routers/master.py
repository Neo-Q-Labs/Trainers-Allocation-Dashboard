from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/master-data")
def get_master_data():
    return cache.get("master_data", {"headers": [], "rows": []})
