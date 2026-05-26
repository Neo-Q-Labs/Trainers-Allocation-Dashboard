from __future__ import annotations

from collections import defaultdict
from typing import Any


def compute_workload(parsed: dict[str, Any]) -> dict[str, Any]:
    """
    Compute per-trainer workload: utilization buckets, top-loaded, under-utilised.
    Utilization is normalized to the most-assigned trainer in the dataset.
    """
    assignments = parsed["assignments"]

    trainer_days: dict[str, int] = defaultdict(int)
    for item in assignments:
        if item.get("trainer"):
            trainer_days[item["trainer"]] += 1

    if not trainer_days:
        return {
            "kpis": {
                "avg_load_pct": 0,
                "overloaded_count": 0,
                "bench_utilization_pct": 0,
                "internal_pct": 58,
                "freelancer_pct": 42,
            },
            "top_loaded": [],
            "under_utilised": [],
            "distribution": {
                "idle": 0,
                "low": 0,
                "healthy": 0,
                "optimal": 0,
                "high": 0,
                "critical": 0,
            },
        }

    max_days = max(trainer_days.values())

    trainer_utils = [
        {
            "name": name,
            "days": days,
            "utilization": min(100, round((days / max_days) * 100)),
        }
        for name, days in trainer_days.items()
    ]
    trainer_utils.sort(key=lambda x: x["utilization"], reverse=True)

    # Bucket distribution
    dist: dict[str, int] = {
        "idle": 0, "low": 0, "healthy": 0, "optimal": 0, "high": 0, "critical": 0
    }
    for t in trainer_utils:
        u = t["utilization"]
        if u <= 20:
            dist["idle"] += 1
        elif u <= 40:
            dist["low"] += 1
        elif u <= 60:
            dist["healthy"] += 1
        elif u <= 85:
            dist["optimal"] += 1
        elif u <= 95:
            dist["high"] += 1
        else:
            dist["critical"] += 1

    overloaded = [t for t in trainer_utils if t["utilization"] > 85]
    under_used = sorted(
        [t for t in trainer_utils if t["utilization"] < 30],
        key=lambda x: x["utilization"],
    )

    avg_load = round(sum(t["utilization"] for t in trainer_utils) / len(trainer_utils))
    total = len(trainer_utils)
    idle_count = dist["idle"] + dist["low"]
    bench_pct = round((idle_count / total) * 100) if total else 0

    def _bar_class(u: int) -> str:
        return "crit" if u > 90 else "warn" if u > 70 else "low"

    top_loaded = [
        {
            "name": t["name"],
            "sub": f"{t['days']} days assigned",
            "utilization": t["utilization"],
            "bar_class": _bar_class(t["utilization"]),
        }
        for t in overloaded[:10]
    ]

    under_utilised = [
        {
            "name": t["name"],
            "sub": f"{t['days']} days assigned",
            "utilization": t["utilization"],
            "bar_class": "low",
        }
        for t in under_used[:10]
    ]

    return {
        "kpis": {
            "avg_load_pct": avg_load,
            "overloaded_count": len(overloaded),
            "bench_utilization_pct": bench_pct,
            "internal_pct": 58,   # Placeholder — trainer type not in parser yet
            "freelancer_pct": 42,
        },
        "top_loaded": top_loaded,
        "under_utilised": under_utilised,
        "distribution": dist,
    }
