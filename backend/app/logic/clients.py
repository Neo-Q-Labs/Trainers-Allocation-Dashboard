from __future__ import annotations

import re
from collections import defaultdict
from typing import Any


# ---------------------------------------------------------------------------
# Known internal trainer names  (mirror of kpis.py INTERNAL_NAMES)
# ---------------------------------------------------------------------------
_INTERNAL_NAMES: set[str] = {
    "azhagu venkadesh sv", "anthony sahaya michael m", "aravindhan s",
    "karan dharmalingam", "kumar raghuveer royal amara", "surya k",
    "karunya mohan", "abinaya p", "manoj kumar", "harshada surendra rajput",
    "harsha ab", "shubhi tiwari", "yogeshwaran kumaran", "subash k",
    "siva prasanna s", "manopalaniraja a", "sahil deswal", "sai raghavendra b",
    "vasudevan badri", "bindhiya j", "anshul mishra",
}

# ---------------------------------------------------------------------------
# Logical client display metadata
# ---------------------------------------------------------------------------
_CLIENT_META: dict[str, dict[str, str]] = {
    "iamneo":   {"name": "iamneo AI",          "logo": "IA", "color": "purple"},
    "skg":      {"name": "SKG Group",           "logo": "SK", "color": "emerald"},
    "lti":      {"name": "LTIMindtree",         "logo": "LT", "color": "cyan"},
    "kct":      {"name": "KCT",                 "logo": "KC", "color": "amber"},
    "hexaware": {"name": "Hexaware",            "logo": "HX", "color": "orange"},
    "parul":    {"name": "Parul University",    "logo": "PU", "color": "indigo"},
    "stjoseph": {"name": "St. Joseph",          "logo": "SJ", "color": "red"},
    "vit":      {"name": "VIT",                 "logo": "VI", "color": "green"},
    "rec":      {"name": "REC",                 "logo": "RE", "color": "pink"},
    "bit":      {"name": "BIT",                 "logo": "BI", "color": "blue"},
    "virtusa":  {"name": "Virtusa",             "logo": "VS", "color": "violet"},
    "other":    {"name": "Other / Internal",    "logo": "OT", "color": "gray"},
}

_COMPLETED_STATUSES: set[str] = {"training completed", "completed"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_client_key(record: dict[str, Any]) -> str:
    """
    Map any record or assignment dict to a logical client key.
    Mirrors the regex patterns in calendar_metrics._extract_client().
    """
    text = " ".join(filter(None, [
        str(record.get("campus", "")           or ""),
        str(record.get("course_name", "")      or ""),
        str(record.get("training_category", "") or ""),
        str(record.get("cell_value", "")       or ""),
    ])).lower()

    if "parul" in text:
        return "parul"
    if re.search(r'\b(skg|skcet|skct|sri[\s_-]?krishna)\b', text):
        return "skg"
    if re.search(r'\b(ltimindtree|ltisa|mindtree)\b', text) or re.search(r'\blti\b', text):
        return "lti"
    if re.search(r'\bkct\b', text):
        return "kct"
    if "hexaware" in text:
        return "hexaware"
    if "iamneo" in text:
        return "iamneo"
    if "st.joseph" in text or "st joseph" in text or "stjoseph" in text:
        return "stjoseph"
    if re.search(r'\bvit\b', text) or "vellore institute" in text:
        return "vit"
    if re.search(r'\brec\b', text) or "rajalakshmi" in text:
        return "rec"
    if re.search(r'\bbit\b', text) or "bannari" in text:
        return "bit"
    if "virtusa" in text:
        return "virtusa"
    return "other"


def _is_internal(trainer_name: str) -> bool:
    """True if the trainer name matches any known internal name."""
    lower = trainer_name.lower().strip()
    return any(name in lower for name in _INTERNAL_NAMES)


# ---------------------------------------------------------------------------
# Main compute function
# ---------------------------------------------------------------------------

def compute_clients(
    parsed: dict[str, Any],
    conflicts: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Compute per-client stats grouped by logical client key.

    Returns:
      kpis  — summary numbers for the KPI strip
      clients — list of client dicts, each containing a full 'deliveries' list
                for the drill-down drawer
    """
    records     = parsed["records"]
    assignments = parsed["assignments"]

    # ------------------------------------------------------------------ #
    # 1. Aggregate trainer details per delivery from assignments
    # ------------------------------------------------------------------ #
    delivery_td: dict[str, dict] = defaultdict(lambda: {
        "internal": set(),
        "freelancer": set(),
        "days": 0,
    })

    for a in assignments:
        trainer = (a.get("trainer") or "").strip()
        if not trainer:
            continue
        did = a.get("delivery_id", "")
        if not did:
            continue
        delivery_td[did]["days"] += 1
        if _is_internal(trainer):
            delivery_td[did]["internal"].add(trainer)
        else:
            delivery_td[did]["freelancer"].add(trainer)

    # ------------------------------------------------------------------ #
    # 2. Conflict counts per campus
    # ------------------------------------------------------------------ #
    conflict_list = (conflicts or {}).get("conflicts", [])
    campus_conflicts: dict[str, int] = defaultdict(int)
    for c in conflict_list:
        for camp in c.get("campuses", []):
            campus_conflicts[camp] += 1

    # ------------------------------------------------------------------ #
    # 3. Build delivery objects, grouped by client key
    #    (deduplicate by delivery_id — first record row wins)
    # ------------------------------------------------------------------ #
    client_deliveries: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen_dids: set[str] = set()

    for record in records:
        did = record["delivery_id"]
        if did in seen_dids:
            continue
        seen_dids.add(did)

        client_key = _extract_client_key(record)
        raw_status = (record.get("status") or "").strip()
        is_completed = raw_status.lower() in _COMPLETED_STATUSES

        td = delivery_td.get(did, {"internal": set(), "freelancer": set(), "days": 0})
        int_names  = sorted(td["internal"])
        free_names = sorted(td["freelancer"])

        client_deliveries[client_key].append({
            "delivery_id":         did,
            "course_name":         (record.get("course_name") or did),
            "campus":              (record.get("campus") or ""),
            "training_category":   (record.get("training_category") or ""),
            "status":              raw_status,
            "is_completed":        is_completed,
            "start_date":          record.get("start_date_iso") or record.get("start_date") or "",
            "end_date":            record.get("end_date_iso")   or record.get("end_date")   or "",
            "trainer_days":        td["days"],
            "trainer_count":       len(int_names) + len(free_names),
            "internal_count":      len(int_names),
            "freelancer_count":    len(free_names),
            "internal_trainers":   int_names,
            "freelancer_trainers": free_names,
        })

    # ------------------------------------------------------------------ #
    # 4. Build client card objects
    # ------------------------------------------------------------------ #
    clients: list[dict[str, Any]] = []

    for client_key, deliveries in client_deliveries.items():
        meta = _CLIENT_META.get(client_key, {
            "name":  client_key.upper(),
            "logo":  client_key[:2].upper(),
            "color": "gray",
        })

        active_dels = [d for d in deliveries if not d["is_completed"]]

        total_days      = sum(d["trainer_days"]   for d in deliveries)
        total_internal  = sum(d["internal_count"] for d in active_dels)
        total_freelancer = sum(d["freelancer_count"] for d in active_dels)

        # Unique active trainers
        active_trainers: set[str] = set()
        for d in active_dels:
            active_trainers.update(d["internal_trainers"])
            active_trainers.update(d["freelancer_trainers"])

        # Occupancy = fraction of active deliveries that have at least 1 trainer
        covered   = sum(1 for d in active_dels if d["trainer_count"] > 0)
        occupancy = round(covered / max(len(active_dels), 1) * 100) if active_dels else 0

        # Gap = active deliveries with NO trainer yet
        gap = sum(1 for d in active_dels if d["trainer_count"] == 0)
        n_conflicts = sum(campus_conflicts.get(d["campus"], 0) for d in deliveries)

        is_at_risk   = gap > 0 or n_conflicts >= 2
        status_label = (
            "At-risk"  if is_at_risk else
            "On-track" if occupancy >= 80 else
            "Open"
        )

        clients.append({
            # Identity
            "client_key":  client_key,
            "name":        meta["name"],
            "logo":        meta["logo"],
            "color":       meta["color"],
            # Legacy shape expected by the existing frontend
            "logo_initials": meta["logo"],
            "logo_class":    client_key[0].lower() if client_key else "i",
            "sub":  (
                f"{len(active_dels)} active "
                f"{'delivery' if len(active_dels) == 1 else 'deliveries'}"
            ),
            # Metrics
            "trainer_days":      total_days,
            "working_days":      total_days,
            "active_programmes": len(active_dels),
            "total_programmes":  len(deliveries),
            "occupancy_pct":     occupancy,
            "total_trainers":    len(active_trainers),
            "total_internal":    total_internal,
            "total_freelancer":  total_freelancer,
            "gap":               gap,
            "conflicts":         n_conflicts,
            # Status
            "status": status_label,
            "risk":   "warn" if is_at_risk else "ok",
            # Drill-down payload
            "deliveries": deliveries,
        })

    # ------------------------------------------------------------------ #
    # 5. Rank & annotate
    # ------------------------------------------------------------------ #
    clients.sort(key=lambda c: c["trainer_days"], reverse=True)
    for i, c in enumerate(clients):
        c["rank"]       = i + 1
        c["rank_class"] = f"rank-{i + 1}" if i < 3 else ""

    # ------------------------------------------------------------------ #
    # 6. Summary KPIs
    # ------------------------------------------------------------------ #
    real_clients = [c for c in clients if c["client_key"] != "other"]
    total_committed = sum(c["trainer_days"]   for c in clients)
    at_risk_count   = sum(1 for c in clients if c["risk"] == "warn")
    avg_occ         = round(sum(c["occupancy_pct"] for c in clients) / len(clients)) if clients else 0
    top_client      = real_clients[0]["name"] if real_clients else "N/A"

    return {
        "kpis": {
            "active_clients":          len(real_clients),
            "trainer_days_committed":  total_committed,
            "top_client":              top_client,
            "avg_occupancy_pct":       avg_occ,
            "at_risk_count":           at_risk_count,
        },
        "clients": clients,   # no [:20] cap — all logical clients
    }
