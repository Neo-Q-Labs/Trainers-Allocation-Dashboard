from __future__ import annotations

from collections import defaultdict
from typing import Any


def build_pipeline(parsed: dict[str, Any]) -> dict[str, Any]:
    grouped: dict[str, dict[str, Any]] = {}
    trainers: dict[str, set[str]] = defaultdict(set)
    delivery_dates: dict[str, set[str]] = defaultdict(set)
    delivery_trainer_dates: dict[str, set[str]] = defaultdict(set)

    for record in parsed["records"]:
        did = record["delivery_id"]
        grouped.setdefault(did, dict(record))

    for item in parsed["assignments"]:
        did = item["delivery_id"]
        delivery_dates[did].add(item["date"])
        if item.get("trainer"):
            trainers[did].add(item["trainer"])
            delivery_trainer_dates[did].add(item["date"])

    deliveries = []
    for did, record in grouped.items():
        trainer_set = trainers.get(did, set())
        trainer_count = len(trainer_set)
        total_dates = len(delivery_dates.get(did, set()))
        filled_dates = len(delivery_trainer_dates.get(did, set()))
        gap = max(0, total_dates - filled_dates)

        # Risk: no trainers = High, partial = Med, full = Low
        if trainer_count == 0:
            risk_level = "High"
        elif gap > 3:
            risk_level = "High"
        elif gap > 0:
            risk_level = "Med"
        else:
            risk_level = "Low"

        deliveries.append(
            {
                "delivery_id": did,
                "status": record.get("status") or "Unknown",
                "campus": record.get("campus") or "Unknown",
                "course_name": record.get("course_name") or "Untitled delivery",
                "start_date": record.get("start_date_iso"),
                "end_date": record.get("end_date_iso"),
                "trainers": sorted(trainer_set),
                "trainer_count": trainer_count,
                "ta_count": 0,
                "gap": gap,
                "risk_level": risk_level,
                "total_slots": total_dates,
                "filled_slots": filled_dates,
            }
        )

    by_status: dict[str, int] = defaultdict(int)
    for item in deliveries:
        by_status[item["status"]] += 1

    deliveries.sort(key=lambda item: (item.get("status") != "Ongoing", item.get("start_date") or ""))
    return {"deliveries": deliveries, "total": len(deliveries), "by_status": dict(by_status)}


def build_campus_stats(parsed: dict[str, Any]) -> dict[str, Any]:
    campus: dict[str, dict[str, Any]] = {}
    trainers: dict[str, set[str]] = defaultdict(set)
    delivery_seen: set[tuple[str, str]] = set()

    for record in parsed["records"]:
        name = record.get("campus") or "Unknown"
        entry = campus.setdefault(
            name,
            {"campus": name, "total_deliveries": 0, "ongoing": 0, "upcoming": 0, "completed": 0, "unique_trainers": 0},
        )
        key = (name, record["delivery_id"])
        if key not in delivery_seen:
            entry["total_deliveries"] += 1
            delivery_seen.add(key)
        status = (record.get("status") or "").lower()
        if status in {"ongoing", "upcoming", "completed"}:
            entry[status] += 1

    for item in parsed["assignments"]:
        if item.get("trainer"):
            trainers[item.get("campus") or "Unknown"].add(item["trainer"])

    rows = []
    for name, entry in campus.items():
        entry["unique_trainers"] = len(trainers.get(name, set()))
        if entry["total_deliveries"]:
            entry["utilization_pct"] = min(100, round((entry["ongoing"] + entry["completed"]) / entry["total_deliveries"] * 100))
        else:
            entry["utilization_pct"] = 0
        rows.append(entry)

    rows.sort(key=lambda item: item["total_deliveries"], reverse=True)
    return {"campuses": rows[:20]}
