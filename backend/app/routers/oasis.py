from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException

from app.cache.store import cache
from app.logic.oasis import assess_opportunity, list_options

router = APIRouter()


@router.get("/oasis/options")
def get_oasis_options():
    """Vocabulary for the OASIS form's Client + Primary Track dropdowns.

    Derived from the live Request ID Track sheet, with Trainer Data Live
    courses folded in as a secondary source.
    """
    rt = cache.get("request_track", {"headers": [], "rows": []})
    tr = cache.get("trainers",      {"headers": [], "trainers": [], "total": 0})
    return list_options(rt, tr)


@router.post("/oasis/assess")
def post_oasis_assess(body: dict = Body(default_factory=dict)):
    """Run an OASIS Opportunity Assessment for a candidate requirement.

    Body shape (all optional except start_date / end_date / demand):
      {
        "delivery_name":  "...",
        "client":         "...",
        "primary_track":  "...",
        "start_date":     "YYYY-MM-DD",
        "end_date":       "YYYY-MM-DD",
        "demand":         5
      }
    """
    start_iso     = body.get("start_date")
    end_iso       = body.get("end_date")
    primary_track = body.get("primary_track", "") or ""
    demand        = body.get("demand", 0)
    client        = body.get("client", "") or ""
    delivery_name = body.get("delivery_name", "") or ""

    if not start_iso or not end_iso:
        raise HTTPException(status_code=400, detail="start_date and end_date are required")

    trainer_payload = cache.get("trainers", {"headers": [], "trainers": [], "total": 0})
    return assess_opportunity(
        start_iso=start_iso,
        end_iso=end_iso,
        primary_track=primary_track,
        demand=demand,
        client=client,
        delivery_name=delivery_name,
        trainer_payload=trainer_payload,
    )
