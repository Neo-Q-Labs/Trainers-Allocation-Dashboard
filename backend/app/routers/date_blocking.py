from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.cache.store import cache
from app.logic.date_blocking import compute_date_blocking

router = APIRouter()


@router.get("/date-blocking")
def get_date_blocking(
    start_date: str | None = Query(None, description="ISO date YYYY-MM-DD (inclusive)"),
    end_date: str | None = Query(None, description="ISO date YYYY-MM-DD (inclusive)"),
):
    """Per-day deployment + availability split by trainer category.

    Defaults to today → today+40 days when params are omitted (matches the
    'All Dates' default range in the UI).
    """
    if not start_date:
        start_date = date.today().isoformat()
    if not end_date:
        end_date = (date.fromisoformat(start_date) + timedelta(days=40)).isoformat()

    parsed = cache.get("parsed", {"records": [], "assignments": []})
    trainer_payload = cache.get("trainers", {"headers": [], "trainers": [], "total": 0})
    request_track  = cache.get("request_track", {"headers": [], "rows": []})

    return compute_date_blocking(start_date, end_date, parsed, trainer_payload, request_track)


@router.get("/availability-for-date")
def get_availability_for_date(
    date_iso: str = Query(..., alias="date", description="ISO date YYYY-MM-DD"),
):
    """Fresh availability list for a single date.

    Reads the latest cached snapshot of Trainer Data Live and returns every
    trainer whose cell is "Not alloted" on the requested date, plus the
    occupied counts so the UI header pills can update in lock-step.
    """
    try:
        date.fromisoformat(date_iso)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date '{date_iso}'") from exc

    parsed = cache.get("parsed", {"records": [], "assignments": []})
    trainer_payload = cache.get("trainers", {"headers": [], "trainers": [], "total": 0})
    request_track  = cache.get("request_track", {"headers": [], "rows": []})

    result = compute_date_blocking(date_iso, date_iso, parsed, trainer_payload, request_track)
    days = result.get("days") or []
    if not days:
        return {
            "date": date_iso,
            "label": "",
            "available": [],
            "available_by_type": {},
            "deployed": 0,
            "tas": 0,
            "deployed_by_type": {},
            "roster_by_type": result.get("summary", {}).get("roster_by_type", {}),
            "synced_at": cache.last_updated.isoformat() if cache.last_updated else None,
            "source": cache.source,
        }
    d = days[0]
    return {
        "date": d.get("date"),
        "label": d.get("label"),
        "available": d.get("available", []),
        "available_by_type": d.get("available_by_type", {}),
        "available_total": d.get("available_total", 0),
        "occupied_by_type": d.get("occupied_by_type", {}),
        "occupied_total": d.get("occupied_total", 0),
        "deployed": d.get("deployed", 0),
        "tas": d.get("tas", 0),
        "backups": d.get("backups", 0),
        "deployed_by_type": d.get("deployed_by_type", {}),
        "roster_by_type": result.get("summary", {}).get("roster_by_type", {}),
        "synced_at": cache.last_updated.isoformat() if cache.last_updated else None,
        "source": cache.source,
    }
