"""OASIS · Opportunity Assessment & Staffing Index.

Given a candidate requirement (delivery name, client, primary track, date
range, demand), produce:

  * status / headline      — overall feasibility verdict
  * summary metric tiles   — full availability / staggered fits / replacement
                              opens / hire recommendation, with sub-labels
  * ranked candidates      — every internal + freelancer trainer scored 0-100
                              with bucket (full | staggered | replacement),
                              skill chips, and a partial-availability label
                              like "PARTIAL · 1-5 JUN".

Source of truth: the cached Trainer Data Live + Request ID Track payloads.
No mock data — every list, chip, and number is derived from those sheets.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Iterable

from app.logic.date_blocking import (
    CATEGORY_ORDER,
    _classify_cell,
    _parse_assignment,
)


_STOPWORDS = {
    "the", "and", "for", "of", "to", "with", "in", "on", "by",
    "training", "trainer", "trainers", "ta", "tas", "backup",
    "fdp", "course", "program", "phase",
}


def _tokens(text: str) -> list[str]:
    if not text:
        return []
    raw = re.sub(r"[^\w\s]+", " ", text.lower())
    return [t for t in raw.split() if t and t not in _STOPWORDS and len(t) >= 2]


def _iter_dates(start: date, end: date) -> Iterable[date]:
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def _avail_runs(sched: dict[str, str], dates: list[date]) -> list[tuple[date, date]]:
    """Return list of (start, end) contiguous free-day runs within dates."""
    runs: list[tuple[date, date]] = []
    cur_start: date | None = None
    cur_last: date | None = None
    for d in dates:
        cell = sched.get(d.isoformat(), "")
        if _classify_cell(cell) == "free":
            if cur_start is None:
                cur_start = d
            cur_last = d
        else:
            if cur_start is not None and cur_last is not None:
                runs.append((cur_start, cur_last))
                cur_start = None
                cur_last = None
    if cur_start is not None and cur_last is not None:
        runs.append((cur_start, cur_last))
    return runs


def _trainer_skill_chips(trainer: dict[str, Any], cap: int = 4) -> list[str]:
    """Distinct past-course strings, up to `cap`, used as the trainer's skill chips."""
    seen: dict[str, str] = {}
    sched = trainer.get("schedule") or {}
    # Newer assignments first if the dict preserves order; fine either way.
    for cell in sched.values():
        if not cell:
            continue
        kind = _classify_cell(cell)
        if kind in ("free", "non_deployable"):
            continue
        parsed = _parse_assignment(cell)
        course = (parsed.get("course") or "").strip()
        if not course:
            continue
        key = course.lower()
        if key in seen:
            continue
        seen[key] = course
        if len(seen) >= cap:
            break
    return list(seen.values())


def _engagement_count(trainer: dict[str, Any]) -> int:
    count = 0
    for cell in (trainer.get("schedule") or {}).values():
        kind = _classify_cell(cell)
        if kind not in ("free", "non_deployable"):
            count += 1
    return count


def _compute_fit_score(
    skill_overlap: float,
    avail_ratio: float,
    is_internal: bool,
    engagement: int,
) -> int:
    """Deterministic 0-100 fit score.

    Bands (rough): 95-100 perfect, 80-94 strong, 60-79 partial, <60 weak.
        skill : up to 50  (overlap of query tokens vs trainer history)
        avail : up to 30  (fraction of requested days that are FREE)
        pool  : 10 internal / 7 freelancer
        depth : up to 10  (engagement count, log-scaled)
    """
    skill_pts = 50 * min(1.0, max(0.0, skill_overlap))
    avail_pts = 30 * min(1.0, max(0.0, avail_ratio))
    pool_pts  = 10 if is_internal else 7
    # Depth: 0 → 0, 5 → ~7, 20+ → 10
    depth_pts = min(10.0, (engagement ** 0.5) * 2.2) if engagement > 0 else 0
    score = round(skill_pts + avail_pts + pool_pts + depth_pts)
    return max(0, min(100, score))


_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def _fmt_run(start: date, end: date) -> str:
    """Format a run like '1-5 JUN' / '28 MAY-3 JUN' / '1 JUN'."""
    if start == end:
        return f"{start.day} {_MONTHS[start.month - 1]}"
    if start.month == end.month and start.year == end.year:
        return f"{start.day}-{end.day} {_MONTHS[start.month - 1]}"
    return f"{start.day} {_MONTHS[start.month - 1]}-{end.day} {_MONTHS[end.month - 1]}"


def assess_opportunity(
    start_iso: str,
    end_iso: str,
    primary_track: str,
    demand: int,
    client: str,
    delivery_name: str,
    trainer_payload: dict[str, Any],
) -> dict[str, Any]:
    """Run the full OASIS assessment. Returns a structured dict, never raises."""
    try:
        start = datetime.strptime(start_iso, "%Y-%m-%d").date()
        end = datetime.strptime(end_iso, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return {"error": "invalid_date", "candidates": [], "summary": _empty_summary()}

    if start > end:
        return {"error": "invalid_range", "candidates": [], "summary": _empty_summary()}

    demand = max(0, int(demand or 0))
    trainers = trainer_payload.get("trainers", []) or []
    dates = list(_iter_dates(start, end))
    total_days = max(1, len(dates))
    query_tokens = _tokens(primary_track)

    candidates: list[dict[str, Any]] = []

    for t in trainers:
        ttype = t.get("type") or ""
        if ttype == "EXIT" or ttype not in CATEGORY_ORDER:
            continue

        sched = t.get("schedule") or {}
        free_days = sum(
            1 for d in dates if _classify_cell(sched.get(d.isoformat(), "")) == "free"
        )
        avail_ratio = free_days / total_days

        # Skill overlap: how many query tokens appear in the trainer's history.
        skill_tokens: set[str] = set()
        for cell in sched.values():
            if _classify_cell(cell) in ("free", "non_deployable"):
                continue
            for tok in _tokens(_parse_assignment(cell).get("course", "")):
                skill_tokens.add(tok)
        skill_overlap = 0.0
        matched_terms: list[str] = []
        if query_tokens:
            hits = 0
            for q in query_tokens:
                for sk in skill_tokens:
                    if q in sk or sk in q:
                        hits += 1
                        matched_terms.append(q)
                        break
            skill_overlap = hits / len(query_tokens)

        is_internal = ttype != "FREELANCER"
        engagement = _engagement_count(t)

        # ---- Bucket the candidate ----
        runs = _avail_runs(sched, dates)
        longest_run = max(runs, key=lambda r: (r[1] - r[0]).days, default=None)

        if avail_ratio >= 0.99:
            bucket = "full"
            avail_label = "FREELANCER FIT" if not is_internal else "FIT"
            avail_sub = None
        elif avail_ratio > 0:
            bucket = "staggered"
            sub = _fmt_run(longest_run[0], longest_run[1]) if longest_run else ""
            avail_label = f"PARTIAL · {sub}" if sub else "PARTIAL"
            avail_sub = sub or None
        else:
            # Busy through the whole range — useful only as a swap target if
            # they have the right skills.
            if skill_overlap > 0:
                bucket = "replacement"
                avail_label = "REPLACE · BUSY"
                avail_sub = None
            else:
                # No availability AND no skill match — drop entirely.
                continue

        score = _compute_fit_score(skill_overlap, avail_ratio, is_internal, engagement)
        # Soft penalty when the planner gave a track but this trainer has zero
        # historical overlap — keeps them in the list but rank low.
        if query_tokens and skill_overlap == 0:
            score = round(score * 0.6)

        candidates.append({
            "name": t.get("name", ""),
            "employee_id": t.get("employee_id", ""),
            "type": ttype,
            "type_raw": t.get("type_raw", "") or ("Freelancer" if not is_internal else "Internal"),
            "vendor": (
                (t.get("_raw") or {}).get("Vendor Name", "")
                if isinstance(t.get("_raw"), dict) else ""
            ),
            "skills": _trainer_skill_chips(t),
            "fit_score": score,
            "bucket": bucket,
            "avail_label": avail_label,
            "avail_sub": avail_sub,
            "avail_ratio": round(avail_ratio, 2),
            "skill_overlap": round(skill_overlap, 2),
            "matched_terms": matched_terms,
            "is_internal": is_internal,
            "engagement": engagement,
        })

    # Sort: Internal first → fit_score desc → engagement desc → name asc.
    candidates.sort(key=lambda c: (
        0 if c["is_internal"] else 1,
        -c["fit_score"],
        -c["engagement"],
        c["name"],
    ))

    # ---- Aggregate ----
    full_av_list   = [c for c in candidates if c["bucket"] == "full"      and (c["skill_overlap"] > 0 or not query_tokens)]
    stag_list      = [c for c in candidates if c["bucket"] == "staggered" and (c["skill_overlap"] > 0 or not query_tokens)]
    repl_list      = [c for c in candidates if c["bucket"] == "replacement"]

    full_av    = len(full_av_list)
    stag_fits  = len(stag_list)
    repl_opens = len(repl_list)
    coverable  = full_av + stag_fits
    hire_rec   = max(0, demand - coverable - repl_opens)

    hard_conflicts = max(0, demand - coverable)

    if demand == 0:
        status = "info"
        headline = "Plug in a requirement to assess feasibility"
    elif full_av >= demand:
        status = "fully_achievable"
        headline = "Fully achievable from internal pool"
    elif coverable >= demand:
        status = "partial"
        headline = "Partially achievable · stagger required"
    elif coverable + repl_opens >= demand:
        status = "needs_swap"
        headline = "Achievable with cross-skill swaps"
    else:
        status = "needs_hire"
        headline = "Hiring required"

    return {
        "request": {
            "delivery_name": delivery_name or "",
            "client": client or "",
            "primary_track": primary_track or "",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "demand": demand,
            "days_in_range": total_days,
            "query_tokens": query_tokens,
        },
        "status": status,
        "headline": headline,
        "summary": {
            "trainers_requested": demand,
            "fully_available":    full_av,
            "partial_available":  stag_fits,
            "hard_conflicts":     hard_conflicts,
            "full_availability":      full_av,
            "staggered_fits":         stag_fits,
            "replacement_opens":      repl_opens,
            "hire_recommendation":    hire_rec,
            "full_availability_label":      _full_av_label(full_av_list, query_tokens),
            "staggered_fits_label":         _staggered_label(stag_list),
            "replacement_opens_label":      "Cross-skill swaps possible" if repl_opens else "—",
            "hire_recommendation_label":    "Bench can absorb" if hire_rec == 0 else f"Hire {hire_rec} freelancer(s)",
        },
        "candidates": candidates[:24],   # cap so the UI stays snappy
    }


def _full_av_label(items: list[dict[str, Any]], query_tokens: list[str]) -> str:
    if not items:
        return "—"
    internal = sum(1 for c in items if c["is_internal"])
    freelancer = sum(1 for c in items if not c["is_internal"])
    bits: list[str] = []
    if internal:
        bits.append("Internal")
    if freelancer:
        bits.append("Freelancer")
    pool = " + ".join(bits) if bits else "Pool"
    return f"{pool} · matched skill" if query_tokens else f"{pool} · free for range"


def _staggered_label(items: list[dict[str, Any]]) -> str:
    if not items:
        return "—"
    subs: list[str] = []
    seen: set[str] = set()
    for c in items:
        s = c.get("avail_sub")
        if s and s not in seen:
            seen.add(s)
            subs.append(s)
        if len(subs) >= 2:
            break
    if not subs:
        return "Partial coverage"
    return "Available " + " / ".join(subs)


def _empty_summary() -> dict[str, Any]:
    return {
        "trainers_requested": 0,
        "fully_available":    0,
        "partial_available":  0,
        "hard_conflicts":     0,
        "full_availability":      0,
        "staggered_fits":         0,
        "replacement_opens":      0,
        "hire_recommendation":    0,
        "full_availability_label":   "—",
        "staggered_fits_label":      "—",
        "replacement_opens_label":   "—",
        "hire_recommendation_label": "—",
    }


# ---------------------------------------------------------------------------
# Dropdown vocabularies — clients + primary tracks, both sourced from the
# Request ID Track sheet so the form mirrors what the planners actually file.
# ---------------------------------------------------------------------------
def list_options(
    request_track_payload: dict[str, Any] | None,
    trainer_payload: dict[str, Any] | None,
) -> dict[str, Any]:
    clients: list[str] = []
    tracks: list[str] = []
    seen_c: set[str] = set()
    seen_t: set[str] = set()

    for row in ((request_track_payload or {}).get("rows") or []):
        if not isinstance(row, dict):
            continue
        c = (row.get("Client Name") or "").strip()
        if c and c.lower() not in seen_c:
            seen_c.add(c.lower())
            clients.append(c)
        course = (row.get("Course") or "").strip()
        if course and course.lower() not in seen_t:
            seen_t.add(course.lower())
            tracks.append(course)

    # Secondary track source — distinct course tokens that appear in Trainer
    # Data Live cells. Catches tracks that the planner hasn't typed into a
    # Request ID Track row yet (e.g. internal-only deliveries).
    for t in ((trainer_payload or {}).get("trainers") or []):
        for cell in (t.get("schedule") or {}).values():
            if _classify_cell(cell) in ("free", "non_deployable"):
                continue
            course = (_parse_assignment(cell).get("course") or "").strip()
            if not course:
                continue
            key = course.lower()
            if key not in seen_t:
                seen_t.add(key)
                tracks.append(course)

    clients.sort(key=str.casefold)
    tracks.sort(key=str.casefold)
    return {"clients": clients, "primary_tracks": tracks}
