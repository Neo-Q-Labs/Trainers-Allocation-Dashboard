from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any


def compute_pending(parsed: dict[str, Any]) -> dict[str, Any]:
    """
    Compute pending allocations: deliveries that have un-filled trainer slots.
    A delivery is pending when its total allotment date range has days without
    a trainer assigned.
    """
    records = parsed["records"]
    assignments = parsed["assignments"]

    # Per delivery: all date cells vs cells that have a trainer
    delivery_dates: dict[str, set[str]] = defaultdict(set)
    delivery_trainer_dates: dict[str, set[str]] = defaultdict(set)

    for item in assignments:
        did = item["delivery_id"]
        delivery_dates[did].add(item["date"])
        if item.get("trainer"):
            delivery_trainer_dates[did].add(item["date"])

    # Index records by delivery_id (keep first occurrence)
    unique_records: dict[str, dict[str, Any]] = {}
    for r in records:
        did = r["delivery_id"]
        if did not in unique_records:
            unique_records[did] = r

    now = datetime.now()
    slots: list[dict[str, Any]] = []

    for did, record in unique_records.items():
        total_dates = len(delivery_dates.get(did, set()))
        filled_dates = len(delivery_trainer_dates.get(did, set()))
        gap = max(0, total_dates - filled_dates)

        # Also include deliveries with NO allotment data at all
        if gap == 0 and total_dates > 0:
            continue  # fully covered

        # Compute days to start for urgency
        days_to_start: int | None = None
        start_raw = record.get("start_date")
        if start_raw:
            try:
                dt = datetime.fromisoformat(str(start_raw))
                days_to_start = (dt - now).days
            except Exception:
                pass

        if days_to_start is not None and days_to_start <= 7:
            urgency = "urgent"
        elif days_to_start is not None and days_to_start <= 14:
            urgency = "warn"
        else:
            urgency = "normal"

        filled = filled_dates
        total = max(total_dates, 1)
        percent = round((filled / total) * 100) if total > 0 else 0

        slots.append(
            {
                "delivery_id": did,
                "course_name": record.get("course_name") or did,
                "campus": record.get("campus") or "Unknown",
                "start_date": record.get("start_date"),
                "end_date": record.get("end_date"),
                "status": record.get("status") or "Unknown",
                "gap": gap,
                "gap_label": "trainer missing" if gap == 1 else "trainers missing",
                "filled": filled,
                "total": total,
                "percent": percent,
                "urgency": urgency,
                "days_to_start": days_to_start,
                "suggested_trainers": [],
            }
        )

    # Sort: urgent first, then by days_to_start ascending
    urgency_order = {"urgent": 0, "warn": 1, "normal": 2}
    slots.sort(
        key=lambda s: (
            urgency_order.get(s["urgency"], 3),
            s["days_to_start"] if s["days_to_start"] is not None else 9999,
        )
    )

    urgent_count = sum(1 for s in slots if s["urgency"] == "urgent")
    tracks_affected = len({s["campus"] for s in slots})
    trainer_days_needed = sum(s["gap"] for s in slots if isinstance(s["gap"], int))

    return {
        "kpis": {
            "open_slots": len(slots),
            "urgent_count": urgent_count,
            "trainer_days_needed": trainer_days_needed,
            "tracks_affected": tracks_affected,
            "auto_suggested": 0,
        },
        "slots": slots[:30],
    }
