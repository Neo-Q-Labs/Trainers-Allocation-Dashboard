"""Date-wise blocking aggregation.

Sources its truth from the **Trainer Data Live** sheet — a per-trainer ×
per-date pivot where the cell value is either:
  - "Not alloted" / "NA"   → trainer is FREE that day
  - any other text         → trainer is BUSY that day. Role is encoded as a
                             suffix on the cell value ("-TA" / "-Backup" /
                             "-Trainer" / no suffix => Trainer).

For each day in the requested range we compute:
  - deployed   : trainers with a non-free cell that day (excluding TAs)
  - tas        : trainers whose cell ends with "-TA"
  - deployed_by_type   : the above split by canonical type bucket
  - available_by_type  : (active roster of that type) − (deployed of that type)

Buckets match the live "Trainer Type" column: FT / SME / WILP / FREELANCER.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Iterable

from app.parser.allotment_parser import parse_date

# Display order for the category buckets — matches the live sheet vocabulary.
CATEGORY_ORDER = ["FT", "SME", "WILP", "FREELANCER"]

# Cell-value substrings (lower-cased) that mark the trainer as FREE that day.
_FREE_CELLS = {"not alloted", "not allocated", "na", "n/a", ""}

# Cell-value substrings that flag the row as administratively unavailable.
# Excluded from both the "deployed" count and the "available" pool.
_NON_DEPLOYABLE_CELLS = {"exit", "exited", "left", "on leave", "leave"}


def _parse_iso(value: str) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _iter_dates(start: date, end: date) -> Iterable[date]:
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def _classify_cell(cell: str) -> str:
    """Return one of: 'free' / 'ta' / 'backup' / 'trainer' / 'non_deployable'."""
    s = (cell or "").strip().lower()
    if s in _FREE_CELLS:
        return "free"
    if s in _NON_DEPLOYABLE_CELLS:
        return "non_deployable"
    # Suffix-based role detection (case-insensitive).
    if s.endswith("-ta") or s.endswith(" ta") or " ta " in s or "internal ta" in s:
        return "ta"
    if "backup" in s or "back up" in s or "back-up" in s:
        return "backup"
    return "trainer"


def _parse_assignment(cell: str) -> dict[str, str]:
    """Best-effort split of a cell value into client / course / role.

    Examples seen in the live sheet:
      "LTIM-MERN-Trainer"        → client=LTIM, course=MERN, role=Trainer
      "SKCET-Rest API-Trainer"   → client=SKCET, course=Rest API, role=Trainer
      "Parul-FDP-Trainers"       → client=Parul, course=FDP, role=Trainers
      "Inhouse Training-WILP"    → client=Inhouse Training, course=WILP, role=Trainer
      "Internal-Upskilling_Trainer" → client=Internal, course=Upskilling, role=Trainer
      "JAVA Full Stack-Trainer"  → client=(blank), course=JAVA Full Stack, role=Trainer
    """
    raw = (cell or "").strip()
    if not raw:
        return {"client": "", "course": "", "role": ""}

    # Strip trailing role suffix if present
    lower = raw.lower()
    role = "Trainer"
    body = raw
    for suffix in ("-trainer", "-trainers", "-ta", "-backup", "-backup trainer", "_trainer"):
        if lower.endswith(suffix):
            body = raw[: -len(suffix)]
            role = "TA" if "ta" in suffix else ("Backup" if "backup" in suffix else "Trainer")
            break

    parts = [p.strip() for p in body.split("-") if p.strip()]
    if len(parts) == 0:
        return {"client": raw, "course": "", "role": role}
    if len(parts) == 1:
        return {"client": "", "course": parts[0], "role": role}
    return {
        "client": parts[0],
        "course": " · ".join(parts[1:]),
        "role": role,
    }


# ---------------------------------------------------------------------------
# Request-ID-Track lookup
# ---------------------------------------------------------------------------
# The Trainer Data Live cell only carries a free-text assignment string
# (e.g. "D&A-Foundation Phase-Trainer"), and its leading token is the *track*
# the trainer is teaching — NOT the real client. The actual client name lives
# on the matching Request ID Track row (`Client Name` column). We resolve it
# by indexing every request-track row by the trainer/TA names listed in its
# "Trainer planned" / "TA Planned" columns.

# Splits a "Trainer planned" or "TA Planned" cell into individual names.
# Tolerant of comma, semicolon, slash, newline, bullet and " and " separators.
_NAME_SPLIT_RE = re.compile(r"[,;/\n\r•|]| and ", re.IGNORECASE)

# Tokens with no discriminating power — we drop them before token-based matching
# so e.g. "Java-Trainer" doesn't accidentally win a match against every Java
# row in Request ID Track regardless of date.
_STOPWORDS = {
    "the", "and", "for", "of", "to", "with", "in", "on", "by",
    "training", "trainer", "trainers", "ta", "tas", "backup",
    "fdp", "course", "program", "phase",
}


def _split_planned_names(value: Any) -> list[str]:
    if value is None:
        return []
    text = str(value).strip()
    if not text:
        return []
    parts = _NAME_SPLIT_RE.split(text)
    out: list[str] = []
    for p in parts:
        name = p.strip(" \t-•·")
        # Drop trailing role markers a planner sometimes writes inline.
        name = re.sub(r"\s*\((?:trainer|ta|backup)\)\s*$", "", name, flags=re.IGNORECASE).strip()
        if name:
            out.append(name)
    return out


def _norm_name(name: str) -> str:
    """Normalised trainer-name key — lower-cased, punctuation-stripped, single-space."""
    s = (name or "").lower()
    # Strip surrounding/embedded punctuation so "John Doe." == "John Doe"
    # and "S. Kumar" == "S Kumar".
    s = re.sub(r"[^\w\s]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _norm_token(text: str) -> str:
    """Aggressive single-token normalisation — lowercase, alnum-only."""
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def _tokens(text: str) -> list[str]:
    """Split text into discriminative lowercase tokens (stopwords removed)."""
    if not text:
        return []
    raw = re.sub(r"[^\w\s]+", " ", text.lower())
    return [t for t in raw.split() if t and t not in _STOPWORDS and len(t) >= 2]


def _build_request_lookup(
    request_track_payload: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build multi-tier indexes over the Request ID Track sheet.

    Returns a dict with these indexes (all share the same plan-entry shape):
      by_name        : normalised trainer/TA name → entries  (primary; highest fidelity)
      by_course_tok  : course token (e.g. "mern", "python") → entries
      by_track_tok   : token derived from the Client Name first word / any
                       discriminative client token → entries
      all_entries    : flat list, used for diagnostics

    A "plan entry" carries the resolved client + course + dates + role hint
    so the resolver can score multiple candidates and pick the best one.
    """
    indexes: dict[str, Any] = {
        "by_name":       {},
        "by_course_tok": {},
        "by_track_tok":  {},
        "all_entries":   [],
    }
    if not request_track_payload:
        return indexes

    by_name: dict[str, list[dict[str, Any]]] = indexes["by_name"]
    by_course_tok: dict[str, list[dict[str, Any]]] = indexes["by_course_tok"]
    by_track_tok: dict[str, list[dict[str, Any]]] = indexes["by_track_tok"]

    rows = request_track_payload.get("rows") or []
    for row in rows:
        if not isinstance(row, dict):
            continue
        client = (row.get("Client Name") or "").strip()
        if not client:
            continue
        course      = (row.get("Course") or "").strip()
        domain      = (row.get("Domain") or "").strip()
        subdomain   = (row.get("Subdomain") or "").strip()
        delivery_id = (row.get("Delivery ID") or "").strip()
        start_d     = parse_date(row.get("Program Start Date"))
        end_d       = parse_date(row.get("Program End Date"))

        base_entry = {
            "client": client,
            "course": course,
            "domain": domain,
            "subdomain": subdomain,
            "delivery_id": delivery_id,
            "start_date": start_d,
            "end_date": end_d,
        }
        indexes["all_entries"].append(base_entry)

        # ---------- Tier 1: index by trainer / TA name --------------------
        any_name = False
        for role_hint, col in (("Trainer", "Trainer planned"), ("TA", "TA Planned")):
            for raw_name in _split_planned_names(row.get(col)):
                key = _norm_name(raw_name)
                if not key:
                    continue
                entry = {**base_entry, "role_hint": role_hint}
                by_name.setdefault(key, []).append(entry)
                any_name = True

        # ---------- Tier 2: index by course token -------------------------
        # Each token of Course (and Domain/Subdomain) gets its own bucket so
        # a cell like "LTIM-MERN-Trainer" can find rows whose Course is "MERN".
        course_entry = {**base_entry, "role_hint": None}
        for tok in _tokens(f"{course} {domain} {subdomain}"):
            key = _norm_token(tok)
            if not key:
                continue
            by_course_tok.setdefault(key, []).append(course_entry)

        # ---------- Tier 3: index by client / track token -----------------
        # Useful when the cell prefix carries a client abbreviation that
        # appears as a token in the Client Name (e.g. cell "LTIM-..." vs
        # Client Name "LTIMindtree Limited").
        track_entry = {**base_entry, "role_hint": None}
        for tok in _tokens(client):
            key = _norm_token(tok)
            if not key:
                continue
            by_track_tok.setdefault(key, []).append(track_entry)

    return indexes


def _date_score(entry: dict[str, Any], on_date: date) -> int:
    s, e = entry.get("start_date"), entry.get("end_date")
    if s and e and s <= on_date <= e:
        return 5
    if s and e:
        # within ±7 days of either boundary — same delivery, planner slack
        if abs((on_date - s).days) <= 7 or abs((on_date - e).days) <= 7:
            return 2
        return 0
    if s or e:
        return 1
    return 0


def _pick_best(
    candidates: list[dict[str, Any]],
    on_date: date,
    role_kind: str,
) -> dict[str, Any] | None:
    """Score candidates and return the highest. None on empty list."""
    if not candidates:
        return None
    role_match = "TA" if role_kind == "ta" else "Trainer"
    best: tuple[int, dict[str, Any]] | None = None
    for c in candidates:
        score = _date_score(c, on_date)
        if c.get("role_hint") == role_match:
            score += 2
        if best is None or score > best[0]:
            best = (score, c)
    return best[1] if best else None


def _resolve_request(
    indexes: dict[str, Any],
    trainer_name: str,
    on_date: date,
    role_kind: str,
    cell_track: str = "",
    cell_course: str = "",
) -> dict[str, Any] | None:
    """Find the best Request ID Track entry for this assignment.

    Tiered resolution (each tier only runs if the previous misses):
      1) trainer-name match — the planner wrote this person on the request
      2) course-token match — cell course matches a Course/Domain in Request
         Track active on this date (planner forgot to fill 'Trainer planned')
      3) track-token match  — cell prefix matches a Client-Name token

    Tiers 2 and 3 require date-overlap (score >= 2) to win; without it we
    return None and let the caller fall back to a blank client rather than
    risk mislabelling.
    """
    # --- Tier 1: name ---------------------------------------------------------
    name_key = _norm_name(trainer_name)
    if name_key:
        hit = _pick_best(indexes["by_name"].get(name_key) or [], on_date, role_kind)
        if hit:
            return {**hit, "_match": "name"}

    # --- Tier 2: course token from the cell ----------------------------------
    for tok in _tokens(cell_course):
        key = _norm_token(tok)
        if not key:
            continue
        cand = indexes["by_course_tok"].get(key) or []
        hit = _pick_best(cand, on_date, role_kind)
        if hit and _date_score(hit, on_date) >= 2:
            return {**hit, "_match": "course"}

    # --- Tier 3: track / client token from the cell prefix --------------------
    for tok in _tokens(cell_track):
        key = _norm_token(tok)
        if not key:
            continue
        cand = indexes["by_track_tok"].get(key) or []
        hit = _pick_best(cand, on_date, role_kind)
        if hit and _date_score(hit, on_date) >= 2:
            return {**hit, "_match": "track"}

    return None


def compute_date_blocking(
    start_iso: str,
    end_iso: str,
    parsed: dict[str, Any],  # legacy Allotment-Data parse, kept for compatibility
    trainer_payload: dict[str, Any],
    request_track_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Per-day deployed + available counts, sourced from Trainer Data Live."""
    start = _parse_iso(start_iso)
    end = _parse_iso(end_iso)
    if not start or not end or start > end:
        return {
            "error": "invalid_date_range",
            "start_date": start_iso,
            "end_date": end_iso,
            "days": [],
            "summary": _empty_summary(),
        }

    trainers = trainer_payload.get("trainers", []) or []
    request_lookup = _build_request_lookup(request_track_payload)

    # Build active-roster counts per type. "EXIT" rows are kept in the roster
    # total but excluded from per-type availability buckets.
    roster_by_type: dict[str, int] = {c: 0 for c in CATEGORY_ORDER}
    roster_unclassified = 0
    for t in trainers:
        bucket = t.get("type") or ""
        if bucket == "EXIT":
            continue
        if bucket in CATEGORY_ORDER:
            roster_by_type[bucket] += 1
        else:
            roster_unclassified += 1

    days_out: list[dict[str, Any]] = []
    sum_deployed = 0
    sum_tas = 0
    sum_by_type = {c: 0 for c in CATEGORY_ORDER}
    min_available_by_type: dict[str, int | None] = {c: None for c in CATEGORY_ORDER}

    for day in _iter_dates(start, end):
        iso = day.isoformat()
        deployed_by_type = {c: 0 for c in CATEGORY_ORDER}
        deployed_total = 0
        ta_count = 0
        backup_count = 0
        delivery_ids: set[str] = set()
        occupied: list[dict[str, Any]] = []
        available: list[dict[str, Any]] = []

        for t in trainers:
            ttype = t.get("type") or ""
            if ttype == "EXIT":
                continue
            cell = (t.get("schedule") or {}).get(iso, "")
            kind = _classify_cell(cell)
            if kind == "non_deployable":
                continue
            if kind == "free":
                if ttype in CATEGORY_ORDER:
                    raw = t.get("_raw") or {}
                    available.append({
                        "name": t.get("name", ""),
                        "type": ttype,
                        "type_raw": t.get("type_raw", ""),
                        "vendor": raw.get("Vendor Name", "") if isinstance(raw, dict) else "",
                        "employee_id": t.get("employee_id", ""),
                    })
                continue

            parsed_cell = _parse_assignment(cell)
            # Override role with the suffix-derived role when classifier is more specific.
            if kind == "ta":
                parsed_cell["role"] = "TA"
                ta_count += 1
            elif kind == "backup":
                parsed_cell["role"] = "Backup"
                backup_count += 1
            else:
                deployed_total += 1
                if ttype in deployed_by_type:
                    deployed_by_type[ttype] += 1

            if cell:
                delivery_ids.add(cell)

            # Cross-reference Request ID Track to surface the *real* client.
            # The resolver tries trainer-name match first, then falls back to
            # course-token and track-token matches (with date-overlap guard).
            req = _resolve_request(
                request_lookup,
                t.get("name", ""),
                day,
                kind,
                cell_track=parsed_cell["client"],   # cell prefix (e.g. "LTIM")
                cell_course=parsed_cell["course"],  # cell body  (e.g. "MERN")
            )
            if req:
                resolved_client = req["client"]
                # Prefer the request's Course; fall back to what the cell carried.
                resolved_course = req.get("course") or parsed_cell["course"] or parsed_cell["client"]
                resolved_delivery_id = req.get("delivery_id") or ""
                resolved_domain = req.get("domain") or ""
                if cell:
                    delivery_ids.add(req["delivery_id"] or cell)
            else:
                # No matching Request ID Track plan across any tier — the cell-prefix
                # is the *track*, NOT the client, so leave client blank rather than
                # mislabel it. The track stays in the `track` field so the UI can
                # surface it where appropriate.
                resolved_client = ""
                if parsed_cell["client"] and parsed_cell["course"]:
                    resolved_course = f'{parsed_cell["client"]} · {parsed_cell["course"]}'
                else:
                    resolved_course = parsed_cell["course"] or parsed_cell["client"]
                resolved_delivery_id = ""
                resolved_domain = ""

            occupied.append({
                "name": t.get("name", ""),
                "type": ttype or "UNCLASSIFIED",
                "type_raw": t.get("type_raw", ""),
                "vendor": t.get("_raw", {}).get("Vendor Name", "") if isinstance(t.get("_raw"), dict) else "",
                "cell": cell,
                "client": resolved_client,
                "course": resolved_course,
                "role": parsed_cell["role"],
                # Extras used by the UI tooltip / debug; older clients ignore them.
                "delivery_id": resolved_delivery_id,
                "domain": resolved_domain,
                "track": parsed_cell["client"],  # the cell-prefix token (= track)
                "client_resolved": bool(req),
                "match_via": (req or {}).get("_match", ""),  # name | course | track | ''
            })

        # Single source of truth: available_by_type is the count of trainers in
        # the available[] list (cells literally == "Not alloted") per category.
        # Everything else (occupied_by_type, total free) is derived from this so
        # the UI surfaces stay consistent.
        available_by_type = {c: 0 for c in CATEGORY_ORDER}
        for p in available:
            t_ = p["type"]
            if t_ in available_by_type:
                available_by_type[t_] += 1

        occupied_by_type = {
            c: max(0, roster_by_type[c] - available_by_type[c]) for c in CATEGORY_ORDER
        }
        occupied_total = sum(occupied_by_type.values())   # any role: trainer/TA/backup
        available_total = sum(available_by_type.values())  # truly free count

        sum_deployed += deployed_total
        sum_tas += ta_count
        for c in CATEGORY_ORDER:
            sum_by_type[c] += deployed_by_type[c]
            cur = min_available_by_type[c]
            min_available_by_type[c] = (
                available_by_type[c] if cur is None else min(cur, available_by_type[c])
            )

        days_out.append({
            "date": iso,
            "weekday": day.strftime("%a"),
            "label": day.strftime("%a, %d %b"),
            "deployed": deployed_total,        # trainers in TRAINER role (chart stack)
            "tas": ta_count,                   # trainers in TA role     (chart stack)
            "backups": backup_count,           # trainers in BACKUP role (chart stack)
            "occupied_total": occupied_total,  # roster - free; matches snapshot OCCUPIED
            "available_total": available_total,  # roster - occupied; matches Availability list length
            "deployed_by_type": deployed_by_type,
            "occupied_by_type": occupied_by_type,  # any-role per category, used by snapshot
            "available_by_type": available_by_type,
            "delivery_count": len(delivery_ids),
            "occupied": occupied,
            "available": available,
        })

    summary = {
        "total_deployed": {
            "TRAINERS": sum_deployed,
            "TAS": sum_tas,
            **sum_by_type,
        },
        "min_available": {
            c: (min_available_by_type[c] if min_available_by_type[c] is not None else roster_by_type[c])
            for c in CATEGORY_ORDER
        },
        "roster_by_type": roster_by_type,
        "roster_unclassified": roster_unclassified,
        "roster_total": sum(roster_by_type.values()) + roster_unclassified,
    }

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "categories": CATEGORY_ORDER,
        "days": days_out,
        "summary": summary,
    }


def _empty_summary() -> dict[str, Any]:
    return {
        "total_deployed": {"TRAINERS": 0, "TAS": 0, **{c: 0 for c in CATEGORY_ORDER}},
        "min_available": {c: 0 for c in CATEGORY_ORDER},
        "roster_by_type": {c: 0 for c in CATEGORY_ORDER},
        "roster_unclassified": 0,
        "roster_total": 0,
    }
