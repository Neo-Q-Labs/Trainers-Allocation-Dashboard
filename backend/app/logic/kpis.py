from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, date, timezone, timedelta
from typing import Any

# Track keyword mapping — maps course_name keywords to skill-area labels
_TRACK_KEYWORDS: list[tuple[str, list[str]]] = [
    ("Java Full Stack", ["java", "spring", "hibernate", "maven"]),
    ("Python / Data", ["python", "data science", "machine learning", "pandas", "numpy", "ml", "ai"]),
    ("Cloud & DevOps", ["aws", "azure", "gcp", "docker", "kubernetes", "devops", "terraform"]),
    ("Frontend / React", ["react", "angular", "vue", "javascript", "typescript", "frontend", "node"]),
    ("Testing / QA", ["testing", "selenium", "qa", "automation", "cypress", "appium"]),
    ("Soft Skills", ["communication", "leadership", "soft skill", "presentation", "interview"]),
    ("Other", []),  # catch-all
]


def _classify_track(course_name: str) -> str:
    lower = (course_name or "").lower()
    for label, keywords in _TRACK_KEYWORDS:
        if any(kw in lower for kw in keywords):
            return label
    return "Other"


def _month_label(iso_date: str) -> str:
    return datetime.fromisoformat(iso_date).strftime("%b %y")


_COMPLETED_STATUSES = {"training completed", "completed"}


def compute_kpis(parsed: dict[str, Any], conflicts: dict[str, Any] | None = None, trainer_roster: dict[str, Any] | None = None) -> dict[str, Any]:
    records = parsed["records"]
    assignments = parsed["assignments"]
    unique_deliveries = {r["delivery_id"] for r in records}
    # Active = non-completed deliveries only
    active_deliveries = {
        r["delivery_id"] for r in records
        if (r.get("status") or "").lower().strip() not in _COMPLETED_STATUSES
    }
    trainers = {a["trainer"] for a in assignments if a.get("trainer")}
    status_counts = Counter(r["status"] or "Unknown" for r in records)
    campus_counts = Counter(r["campus"] or "Unknown" for r in records)

    # --- Frontend KPI strip fields ---
    # Only count active deliveries for allocation gap (completed ones are done — no gap)
    active_with_trainers = {
        a["delivery_id"] for a in assignments
        if a.get("trainer") and a["delivery_id"] in active_deliveries
    }
    open_gap = len(active_deliveries - active_with_trainers)
    allocation_complete_pct = (
        round(len(active_with_trainers) / len(active_deliveries) * 100)
        if active_deliveries else 0
    )
    monthly: dict[str, Counter[str]] = defaultdict(Counter)

    for item in assignments:
        if item.get("trainer"):
            monthly[_month_label(item["date"])][item["status"] or "Unknown"] += 1

    monthly_activity = [
        {
            "month": month,
            "ongoing": counts.get("Ongoing", 0),
            "upcoming": counts.get("Upcoming", 0),
            "completed": counts.get("Completed", 0),
            "total": sum(counts.values()),
        }
        for month, counts in sorted(monthly.items(), key=lambda item: datetime.strptime(item[0], "%b %y"))
    ]

    billable = sum(1 for r in records if (r.get("comments") or "").lower().find("non") == -1)
    non_billable = max(len(records) - billable, 0)
    billable_pct = round((billable / len(records)) * 100) if records else 0

    weekly = defaultdict(int)
    for item in assignments:
        if item.get("trainer"):
            dt = datetime.fromisoformat(item["date"])
            year, week, _ = dt.isocalendar()
            weekly[f"{year}-W{week:02d}"] += 1

    workload = [
        {"week": key, "assigned": value, "capacity": max(value, 1) + 15}
        for key, value in sorted(weekly.items())[-12:]
    ]

    # --- Track coverage: group deliveries by skill area ---
    track_counts: Counter[str] = Counter()
    track_filled: Counter[str] = Counter()
    for r in records:
        label = _classify_track(r.get("course_name", ""))
        track_counts[label] += 1

    for a in assignments:
        if a.get("trainer"):
            # find matching record
            label = "Other"
            for r in records:
                if r["delivery_id"] == a.get("delivery_id"):
                    label = _classify_track(r.get("course_name", ""))
                    break
            track_filled[label] += 1

    total_deliveries = len(records) or 1
    _TRACK_COLORS = {
        "Java Full Stack": "#6366f1",
        "Python / Data": "#22d3a5",
        "Cloud & DevOps": "#f5c542",
        "Frontend / React": "#06b6d4",
        "Testing / QA": "#a855f7",
        "Soft Skills": "#ef4444",
        "Other": "#64748b",
    }
    track_coverages = [
        {
            "track": label,
            "pct": round(count / total_deliveries * 100),
            "color": _TRACK_COLORS.get(label, "#64748b"),
            "filled": track_filled.get(label, 0),
            "total": count,
        }
        for label, count in track_counts.most_common()
        if count > 0
    ]

    # --- Suggested actions: derive from open gaps and conflicts ---
    suggested_actions: list[dict[str, Any]] = []
    open_conflict_count = (conflicts or {}).get("total_conflicts", 0)
    if open_gap > 0:
        suggested_actions.append({
            "type": "gap",
            "label": f"{open_gap} deliveries still need a trainer",
            "action": "Go to Pending Allocations",
            "severity": "high" if open_gap > 5 else "medium",
        })
    if open_conflict_count > 0:
        suggested_actions.append({
            "type": "conflict",
            "label": f"{open_conflict_count} double-booking conflict{'s' if open_conflict_count != 1 else ''} detected",
            "action": "Review Conflicts",
            "severity": "high",
        })
    # Overloaded trainers hint (from distribution if available, else skip)
    billable_gap = 100 - allocation_complete_pct
    if billable_gap > 20:
        suggested_actions.append({
            "type": "allocation",
            "label": f"Allocation only {allocation_complete_pct}% complete — {open_gap} open slots",
            "action": "Review Requirements",
            "severity": "medium",
        })
    if not suggested_actions:
        suggested_actions.append({
            "type": "ok",
            "label": "All deliveries allocated — no immediate action required",
            "action": None,
            "severity": "low",
        })

    # Daily Demand vs Capacity (30-day Outlook) starting today
    start_date = date.today()
    outlook_days = []

    daily_internal = defaultdict(int)
    daily_freelancer = defaultdict(int)
    daily_ta = defaultdict(int)

    INTERNAL_NAMES = {
        "azhagu venkadesh sv", "anthony sahaya michael m", "aravindhan s", 
        "karan dharmalingam", "kumar raghuveer royal amara", "surya k", 
        "karunya mohan", "abinaya p", "manoj kumar", "harshada surendra rajput", 
        "harsha ab", "shubhi tiwari", "yogeshwaran kumaran", "subash k", 
        "siva prasanna s", "manopalaniraja a", "sahil deswal", "sai raghavendra b", 
        "vasudevan badri", "bindhiya j", "anshul mishra"
    }

    for a in assignments:
        try:
            d_str = a["date"]
            dt = date.fromisoformat(d_str)
        except (ValueError, KeyError):
            continue

        role = (a.get("role") or "").lower()
        trainer = (a.get("trainer") or "").strip()

        if not trainer:
            continue

        if "ta" in role or "teaching assistant" in role:
            daily_ta[dt] += 1
        else:
            trainer_lower = trainer.lower()
            is_internal = any(name in trainer_lower for name in INTERNAL_NAMES)
            if is_internal:
                daily_internal[dt] += 1
            else:
                daily_freelancer[dt] += 1

    for i in range(30):
        cur_date = start_date + timedelta(days=i)
        is_weekend = cur_date.weekday() >= 5

        cap_i = 8 if is_weekend else 28
        cap_f = 4 if is_weekend else 14

        outlook_days.append({
            "date": cur_date.isoformat(),
            "d": cur_date.day,
            "m": cur_date.strftime("%b"),
            "i": daily_internal[cur_date],
            "f": daily_freelancer[cur_date],
            "t": daily_ta[cur_date],
            "capI": cap_i,
            "capF": cap_f
        })

    # Trainer roster count from Trainer Data Live sheet
    trainer_roster_count = (trainer_roster or {}).get("total", 0)

    return {
        # Overview KPI strip — aligned to frontend overviewKpis shape
        # active_requirements = non-completed deliveries (Ongoing + Upcoming)
        "active_requirements": len(active_deliveries),
        "total_deliveries": len(unique_deliveries),   # includes completed — for reference
        "trainers_on_ground": len(trainers),
        "trainer_roster_count": trainer_roster_count,
        "allocation_complete_pct": allocation_complete_pct,
        "open_gap": open_gap,
        # Aliases kept for backward-compat
        "active_deliveries": len(active_deliveries),
        "open_conflicts": open_conflict_count,
        "billable_rate": billable_pct,
        "status_breakdown": dict(status_counts),
        "campus_breakdown": dict(campus_counts.most_common(12)),
        "monthly_activity": monthly_activity[-10:],
        "billing": {
            "billable": billable,
            "non_billable": non_billable,
            "na": 0,
            "billable_pct": billable_pct,
            "non_billable_pct": 100 - billable_pct,
            "na_pct": 0,
        },
        "workload": workload,
        # New: Overview panel extras
        "track_coverages": track_coverages,
        "suggested_actions": suggested_actions,
        "demand_vs_capacity": outlook_days,
    }
