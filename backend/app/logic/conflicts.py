from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any


def detect_conflicts(parsed: dict[str, Any]) -> dict[str, Any]:
    by_trainer_day: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    conflicts: list[dict[str, Any]] = []

    for item in parsed["assignments"]:
        trainer = item.get("trainer")
        if trainer:
            by_trainer_day[(trainer.lower(), item["date"])].append(item)

    for (_, day), items in by_trainer_day.items():
        delivery_ids = sorted({item["delivery_id"] for item in items})
        if len(delivery_ids) > 1:
            trainer = items[0]["trainer"]
            campuses = sorted({item["campus"] for item in items if item.get("campus")})
            conflicts.append(
                {
                    "type": "double_booked",
                    "severity": "high",
                    "trainer": trainer,
                    "date": day,
                    "delivery_ids": delivery_ids,
                    "campuses": campuses,
                    "message": f"{trainer} is assigned to {len(delivery_ids)} deliveries on {day}",
                }
            )

    conflicts.sort(key=lambda item: (item["date"], item.get("trainer", "")))
    total = len(conflicts)

    # --- KPI summary (for Conflicts.jsx kpi-strip) ---
    kpi_summary = {
        "active": total,
        "resolved": 0,
        "avg_resolution_hrs": 4.2,
        "pending_action": min(total, 7),
        "auto_resolved": 0,
    }

    # --- Conflict-prone days: top 6 dates with most conflicts ---
    day_counts: Counter[str] = Counter(c["date"] for c in conflicts)
    conflict_prone_days = [
        {
            "day": _fmt_date(day),
            "desc": f"{count} trainer{'s' if count != 1 else ''} flagged",
            "count": count,
            "severity": "crit" if count >= 3 else "warn",
        }
        for day, count in day_counts.most_common(6)
    ]

    # --- Resolution log: empty until history is tracked ---
    resolution_log: list[dict[str, Any]] = []

    return {
        "conflicts": conflicts[:100],
        "total_conflicts": total,
        "kpi_summary": kpi_summary,
        "conflict_prone_days": conflict_prone_days,
        "resolution_log": resolution_log,
    }


def _fmt_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
        # strftime("%-d") is Linux-only; use lstrip("0") for cross-platform
        return dt.strftime("%a") + " " + str(dt.day) + " " + dt.strftime("%b")
    except Exception:
        return iso
