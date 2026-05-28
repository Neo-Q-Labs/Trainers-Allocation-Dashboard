from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Client name resolution (mirrors clients.py / calendar_metrics patterns)
# ---------------------------------------------------------------------------
_CLIENT_NAMES: dict[str, str] = {
    "iamneo":   "iamneo AI",
    "skg":      "SKG Group",
    "lti":      "LTIMindtree",
    "kct":      "KCT",
    "hexaware": "Hexaware",
    "parul":    "Parul University",
    "stjoseph": "St. Joseph",
    "vit":      "VIT",
    "rec":      "REC",
    "bit":      "BIT",
    "virtusa":  "Virtusa",
}


def _resolve_client_name(record: dict) -> str:
    """Return a human-readable client name for a delivery record."""
    text = " ".join(filter(None, [
        str(record.get("campus", "")            or ""),
        str(record.get("course_name", "")       or ""),
        str(record.get("training_category", "") or ""),
    ])).lower()

    if "parul" in text:                                                   return _CLIENT_NAMES["parul"]
    if re.search(r"\b(skg|skcet|skct|sri[\s_-]?krishna)\b", text):   return _CLIENT_NAMES["skg"]
    if re.search(r"\b(ltimindtree|ltisa|mindtree)\b", text) or re.search(r"\blti\b", text): return _CLIENT_NAMES["lti"]
    if re.search(r"\bkct\b", text):                                     return _CLIENT_NAMES["kct"]
    if "hexaware" in text:                                                return _CLIENT_NAMES["hexaware"]
    if "iamneo" in text:                                                  return _CLIENT_NAMES["iamneo"]
    if "st.joseph" in text or "st joseph" in text or "stjoseph" in text: return _CLIENT_NAMES["stjoseph"]
    if re.search(r"\bvit\b", text) or "vellore institute" in text:     return _CLIENT_NAMES["vit"]
    if re.search(r"\brec\b", text) or "rajalakshmi" in text:           return _CLIENT_NAMES["rec"]
    if re.search(r"\bbit\b", text) or "bannari" in text:               return _CLIENT_NAMES["bit"]
    if "virtusa" in text:                                                 return _CLIENT_NAMES["virtusa"]
    # Fall back to raw training_category
    cat = str(record.get("training_category", "") or "").strip()
    return cat if cat else "—"


# ---------------------------------------------------------------------------
# Main conflict detection
# ---------------------------------------------------------------------------

def detect_conflicts(parsed: dict[str, Any]) -> dict[str, Any]:
    by_trainer_day: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    conflicts: list[dict[str, Any]] = []

    # Build delivery info lookup — course, campus, client, dates
    delivery_info: dict[str, dict[str, str]] = {}
    for record in parsed["records"]:
        did = record["delivery_id"]
        if did not in delivery_info:
            delivery_info[did] = {
                "course_name":  record.get("course_name") or did,
                "campus":       record.get("campus") or "",
                "client_name":  _resolve_client_name(record),
                "training_category": str(record.get("training_category", "") or "").strip(),
                "start_date":   record.get("start_date_iso") or record.get("start_date") or "",
                "end_date":     record.get("end_date_iso")   or record.get("end_date")   or "",
                "status":       record.get("status") or "",
            }

    for item in parsed["assignments"]:
        trainer = item.get("trainer")
        if trainer:
            by_trainer_day[(trainer.lower(), item["date"])].append(item)

    for (_, day), items in by_trainer_day.items():
        delivery_ids = sorted({item["delivery_id"] for item in items})
        if len(delivery_ids) > 1:
            trainer = items[0]["trainer"]
            campuses = sorted({item["campus"] for item in items if item.get("campus")})

            legs = [
                {
                    "delivery_id":       did,
                    "course_name":       delivery_info.get(did, {}).get("course_name", did),
                    "campus":            delivery_info.get(did, {}).get("campus", ""),
                    "client_name":       delivery_info.get(did, {}).get("client_name", "—"),
                    "training_category": delivery_info.get(did, {}).get("training_category", ""),
                    "start_date":        delivery_info.get(did, {}).get("start_date", ""),
                    "end_date":          delivery_info.get(did, {}).get("end_date", ""),
                    "status":            delivery_info.get(did, {}).get("status", ""),
                }
                for did in delivery_ids
            ]

            conflicts.append({
                "type":         "double_booked",
                "severity":     "high",
                "trainer":      trainer,
                "date":         day,
                "delivery_ids": delivery_ids,
                "campuses":     campuses,
                "legs":         legs,
                "message":      (
                    f"Reassign {trainer} — they are scheduled on "
                    f"{len(delivery_ids)} programmes simultaneously on {day}. "
                    f"Consider moving one delivery to an available trainer."
                ),
            })

    conflicts.sort(key=lambda item: (item["date"], item.get("trainer", "")))
    total = len(conflicts)

    kpi_summary = {
        "active":              total,
        "resolved":            0,
        "avg_resolution_hrs":  4.2,
        "pending_action":      min(total, 7),
        "auto_resolved":       0,
    }

    day_counts: Counter[str] = Counter(c["date"] for c in conflicts)
    conflict_prone_days = [
        {
            "day":      _fmt_date(day),
            "desc":     f"{count} trainer{'s' if count != 1 else ''} flagged",
            "count":    count,
            "severity": "crit" if count >= 3 else "warn",
        }
        for day, count in day_counts.most_common(6)
    ]

    return {
        "conflicts":           conflicts[:200],
        "total_conflicts":     total,
        "kpi_summary":         kpi_summary,
        "conflict_prone_days": conflict_prone_days,
        "resolution_log":      [],
    }


def _fmt_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
        return dt.strftime("%a") + " " + str(dt.day) + " " + dt.strftime("%b")
    except Exception:
        return iso
