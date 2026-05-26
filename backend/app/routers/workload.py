from fastapi import APIRouter

from app.cache.store import cache

router = APIRouter()


@router.get("/workload")
def get_workload():
    return cache.get(
        "workload",
        {
            "kpis": {},
            "top_loaded": [],
            "under_utilised": [],
            "distribution": {},
        },
    )
