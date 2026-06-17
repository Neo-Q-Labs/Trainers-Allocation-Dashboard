from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from app.cache.store import cache
from app.logic.calendar_metrics import compute_calendar_data

router = APIRouter()


@router.get("/calendar-metrics")
async def get_calendar_metrics():
    data = cache.get("calendar_metrics")
    if data is None:
        raise HTTPException(
            status_code=503,
            detail="Calendar metrics not yet computed. Excel may still be loading.",
        )
    return data


@router.get("/calendar-data")
async def get_calendar_data(
    year: int = Query(2026, description="Year to fetch calendar data for"),
    month: int = Query(None, description="Month to fetch (1-12), if None returns full year")
):
    """Get calendar events and demand data for calendar views"""
    parsed = cache.get("parsed")
    if parsed is None:
        raise HTTPException(
            status_code=503,
            detail="Calendar data not yet computed. Excel may still be loading.",
        )
    
    calendar_data = compute_calendar_data(parsed, year, month)
    return calendar_data


@router.get("/calendar-week")
async def get_calendar_week(
    date: str = Query(..., description="ISO date string (YYYY-MM-DD) for the week")
):
    """Get detailed week data for a specific date"""
    parsed = cache.get("parsed")
    if parsed is None:
        raise HTTPException(
            status_code=503,
            detail="Calendar data not yet computed. Excel may still be loading.",
        )
    
    from app.logic.calendar_metrics import compute_week_data
    week_data = compute_week_data(parsed, date)
    return week_data


@router.get("/calendar-gantt")
async def get_calendar_gantt(
    start_date: str = Query(..., description="Start date for gantt view (YYYY-MM-DD)"),
    days: int = Query(28, description="Number of days to show")
):
    """Get trainer gantt data for calendar gantt view"""
    parsed = cache.get("parsed")
    if parsed is None:
        raise HTTPException(
            status_code=503,
            detail="Calendar data not yet computed. Excel may still be loading.",
        )
    
    from app.logic.calendar_metrics import compute_gantt_data
    gantt_data = compute_gantt_data(parsed, start_date, days)
    return gantt_data
