from __future__ import annotations

from collections import defaultdict
from typing import Any


def compute_clients(
    parsed: dict[str, Any],
    conflicts: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Compute per-client/campus stats for the Clients page.
    Ranked by total trainer-days allocated.
    """
    records = parsed["records"]
    assignments = parsed["assignments"]

    # --- Aggregate by campus ---
    campus_deliveries: dict[str, set[str]] = defaultdict(set)
    campus_trainer_days: dict[str, int] = defaultdict(int)
    campus_trainers: dict[str, set[str]] = defaultdict(set)
    campus_programmes: dict[str, list[str]] = defaultdict(list)

    for record in records:
        campus = record.get("campus") or "Unknown"
        did = record["delivery_id"]
        campus_deliveries[campus].add(did)
        course = record.get("course_name") or did
        if course not in campus_programmes[campus]:
            campus_programmes[campus].append(course)

    for item in assignments:
        campus = item.get("campus") or "Unknown"
        if item.get("trainer"):
            campus_trainer_days[campus] += 1
            campus_trainers[campus].add(item["trainer"])

    # Conflict counts per campus
    conflict_list = (conflicts or {}).get("conflicts", [])
    campus_conflicts: dict[str, int] = defaultdict(int)
    for c in conflict_list:
        for camp in c.get("campuses", []):
            campus_conflicts[camp] += 1

    # Build client rows
    clients: list[dict[str, Any]] = []
    for campus, delivery_set in campus_deliveries.items():
        days = campus_trainer_days.get(campus, 0)
        n_conflicts = campus_conflicts.get(campus, 0)
        n_trainers = len(campus_trainers.get(campus, set()))
        n_deliveries = len(delivery_set)

        # Simplified occupancy: trainer coverage relative to deliveries
        occupancy = min(100, round((n_trainers / max(n_deliveries, 1)) * 25))

        risk = "warn" if n_conflicts >= 2 or occupancy < 40 else "ok"
        status = "At-risk" if risk == "warn" else ("Ongoing" if occupancy >= 80 else "On-track")

        progs = campus_programmes.get(campus, [])

        clients.append(
            {
                "name": campus,
                "sub": f"{n_deliveries} active {'delivery' if n_deliveries == 1 else 'deliveries'}",
                "logo_initials": campus[:2].upper(),
                "logo_class": campus[0].lower() if campus else "i",
                "trainer_days": days,
                "active_programmes": n_deliveries,
                "occupancy_pct": occupancy,
                "working_days": days,
                "programmes": progs[:4],
                "extra_programmes": max(0, len(progs) - 4),
                "conflicts": n_conflicts,
                "status": status,
                "risk": risk,
            }
        )

    # Rank by trainer-days
    clients.sort(key=lambda c: c["trainer_days"], reverse=True)
    for i, client in enumerate(clients):
        client["rank"] = i + 1
        client["rank_class"] = f"rank-{i + 1}" if i < 3 else ""

    total_days = sum(c["trainer_days"] for c in clients)
    at_risk = sum(1 for c in clients if c["risk"] == "warn")
    avg_occ = (
        round(sum(c["occupancy_pct"] for c in clients) / len(clients)) if clients else 0
    )
    top_client = clients[0]["name"] if clients else "N/A"

    return {
        "kpis": {
            "active_clients": len(clients),
            "trainer_days_committed": total_days,
            "top_client": top_client,
            "avg_occupancy_pct": avg_occ,
            "at_risk_count": at_risk,
        },
        "clients": clients[:20],
    }
