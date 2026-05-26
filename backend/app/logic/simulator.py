"""New-Requirement Simulator.

Given a candidate requirement (client, tech stack, date range, demand), find
trainers who are:

  1. Free for the *entire* date range (every cell in Trainer Data Live reads
     "Not alloted" between start_date and end_date inclusive), AND
  2. Have past experience matching the requested tech stack — derived from
     the course/track names that appear in their previous assignment cells
     (e.g. "LTIM-MERN-Trainer" → MERN, "KCT-Python Programming-Trainer" →
     Python Programming).

Returns the matched trainers ordered Internal → Freelancer, with the
skill-matched ones surfaced first inside each pool.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from app.logic.date_blocking import (
    CATEGORY_ORDER,
    _classify_cell,
    _parse_assignment,
)

INTERNAL_PRIORITY = ["FT", "SME", "WILP", "FREELANCER"]


def _iter_dates(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def _tokenize(text: str) -> list[str]:
    if not text:
        return []
    raw = text.lower()
    # Replace common separators with space so multi-word phrases get split
    for sep in [",", "/", "+", "&", "|", "·", "."]:
        raw = raw.replace(sep, " ")
    return [t.strip() for t in raw.split() if len(t.strip()) >= 2]


def _derive_skill_tokens(trainer: dict[str, Any]) -> tuple[set[str], list[str], int]:
    """From the trainer's schedule, return (skill_tokens, raw_courses, engagement_count).

    skill_tokens   : lowercased keyword set, used for fuzzy matching
    raw_courses    : up-to-10 distinct course strings as seen in the sheet
                     (shown back in the UI so the planner can sanity-check)
    engagement_cnt : how many non-free cells the trainer has (a proxy for
                     activity level)
    """
    tokens: set[str] = set()
    courses: list[str] = []
    seen_courses: set[str] = set()
    engagement_count = 0

    sched = trainer.get("schedule") or {}
    for cell in sched.values():
        if not cell:
            continue
        kind = _classify_cell(cell)
        if kind in ("free", "non_deployable"):
            continue
        engagement_count += 1
        parsed = _parse_assignment(cell)
        course = (parsed.get("course") or "").strip()
        if course:
            key = course.lower()
            if key not in seen_courses:
                seen_courses.add(key)
                courses.append(course)
            for tok in _tokenize(course):
                tokens.add(tok)

    return tokens, courses[:10], engagement_count


def _skill_match_score(
    trainer_tokens: set[str], query_tokens: list[str]
) -> tuple[bool, list[str]]:
    """Return (is_match, matched_query_terms).

    A trainer matches if any of their derived skill tokens contains or is
    contained in any of the query tokens (case-insensitive substring match).
    This is intentionally lenient so e.g. "java" matches both "java" and
    "javafs".
    """
    if not query_tokens:
        return False, []

    matched: list[str] = []
    for q in query_tokens:
        for sk in trainer_tokens:
            if q in sk or sk in q:
                if q not in matched:
                    matched.append(q)
                break
    return bool(matched), matched


def simulate_requirement(
    start_iso: str,
    end_iso: str,
    tech_stack: str,
    demand: int,
    client: str,
    trainer_payload: dict[str, Any],
    ta_demand: int = 0,
) -> dict[str, Any]:
    try:
        start = datetime.strptime(start_iso, "%Y-%m-%d").date()
        end = datetime.strptime(end_iso, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "invalid_date", "matched": [], "summary": {}}

    if start > end:
        return {"error": "invalid_range", "matched": [], "summary": {}}

    demand = max(0, int(demand or 0))
    ta_demand = max(0, int(ta_demand or 0))
    total_demand = demand + ta_demand
    trainers = trainer_payload.get("trainers", []) or []
    dates = [d.isoformat() for d in _iter_dates(start, end)]
    query_tokens = _tokenize(tech_stack)
    has_query = bool(query_tokens)

    matched: list[dict[str, Any]] = []
    type_order = {c: i for i, c in enumerate(INTERNAL_PRIORITY)}

    for t in trainers:
        ttype = t.get("type") or ""
        if ttype == "EXIT" or ttype not in CATEGORY_ORDER:
            continue

        sched = t.get("schedule") or {}

        # 1) Strict full-range availability check
        is_fully_free = True
        for iso in dates:
            cell = sched.get(iso, "")
            kind = _classify_cell(cell)
            if kind != "free":
                is_fully_free = False
                break
        if not is_fully_free:
            continue

        # 2) Derive skills from past assignments
        skill_tokens, past_courses, engagement_count = _derive_skill_tokens(t)
        skill_match, matched_terms = _skill_match_score(skill_tokens, query_tokens)

        raw = t.get("_raw") or {}
        matched.append({
            "name": t.get("name", ""),
            "type": ttype,
            "type_raw": t.get("type_raw", ""),
            "vendor": raw.get("Vendor Name", "") if isinstance(raw, dict) else "",
            "employee_id": t.get("employee_id", ""),
            "email": t.get("email", ""),
            "phone": t.get("phone", ""),
            "skill_match": skill_match,            # True | False  (False = available but no skill evidence)
            "matched_terms": matched_terms,         # which query tokens hit
            "past_courses": past_courses,           # up to 10 course names from history
            "past_engagement_count": engagement_count,
            "type_order": type_order.get(ttype, 99),
        })

    # Sort: skill-matched first (only if query present), then Internal pools, then alphabetic
    def sort_key(m: dict[str, Any]):
        match_bucket = 0 if (has_query and m["skill_match"]) else (1 if has_query else 0)
        return (match_bucket, m["type_order"], -m["past_engagement_count"], m["name"])

    matched.sort(key=sort_key)

    # Aggregate counts
    skill_matched_internal = sum(
        1 for m in matched if m["skill_match"] and m["type"] != "FREELANCER"
    )
    skill_matched_freelancer = sum(
        1 for m in matched if m["skill_match"] and m["type"] == "FREELANCER"
    )
    skill_matched_total = skill_matched_internal + skill_matched_freelancer

    # "Eligible" = available; if a query is present, we still surface non-matches
    # in a separate bucket so the planner can see they're free but unverified.
    eligible_internal = sum(1 for m in matched if m["type"] != "FREELANCER")
    eligible_freelancer = sum(1 for m in matched if m["type"] == "FREELANCER")
    eligible_total = len(matched)

    if has_query:
        coverable = skill_matched_total
    else:
        coverable = eligible_total

    shortfall = max(0, total_demand - coverable)

    demand_label = (
        f"{demand} trainer(s)" if ta_demand == 0
        else f"{ta_demand} TA(s)" if demand == 0
        else f"{demand} trainer(s) + {ta_demand} TA(s)"
    )

    if total_demand == 0:
        recommendation = f"{eligible_total} person(s) free for the full range."
    elif shortfall == 0 and has_query and skill_matched_internal >= total_demand:
        recommendation = (
            f"{demand_label} can be fully covered by the internal pool — "
            f"{skill_matched_internal} skill-matched internal person(s) available."
        )
    elif shortfall == 0 and has_query:
        remaining = max(0, total_demand - skill_matched_internal)
        recommendation = (
            f"Internal can cover {skill_matched_internal} of {demand_label}; "
            f"add {remaining} freelancer(s) to close the gap."
        )
    elif shortfall == 0:
        recommendation = (
            f"{demand_label} can be met from the {eligible_total} available person(s)."
        )
    elif has_query:
        recommendation = (
            f"Only {skill_matched_total} skill-matched person(s) free for the full "
            f"range — short by {shortfall} for the requested {demand_label}. "
            f"Try broadening the tech stack, shrinking the date range, or considering "
            f"people without prior {tech_stack} history."
        )
    else:
        recommendation = (
            f"Only {eligible_total} person(s) free for the full range — "
            f"short by {shortfall} for the requested {demand_label}. Try shrinking the date range."
        )

    return {
        "request": {
            "client": client or "",
            "tech_stack": tech_stack or "",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "demand": demand,
            "ta_demand": ta_demand,
            "total_demand": total_demand,
            "days_in_range": len(dates),
            "query_tokens": query_tokens,
        },
        "matched": matched,
        "summary": {
            "eligible_total": eligible_total,
            "eligible_internal": eligible_internal,
            "eligible_freelancer": eligible_freelancer,
            "skill_matched_total": skill_matched_total,
            "skill_matched_internal": skill_matched_internal,
            "skill_matched_freelancer": skill_matched_freelancer,
            "coverable": coverable,
            "demand": demand,
            "ta_demand": ta_demand,
            "total_demand": total_demand,
            "shortfall": shortfall,
            "has_query": has_query,
        },
        "recommendation": recommendation,
    }
