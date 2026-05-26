from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/clients")
def get_clients():
    return cache.get("clients", {"kpis": {}, "clients": []})
