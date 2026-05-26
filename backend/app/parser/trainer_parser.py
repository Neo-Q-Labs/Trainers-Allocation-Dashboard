from __future__ import annotations

from datetime import date
from typing import Any

from app.parser.allotment_parser import normalize_text, parse_date, parse_generic_sheet


# Cell values in "Trainer Data Live" that mean the trainer is NOT booked that day.
FREE_CELL_VALUES: set[str] = {"not alloted", "not allocated", "na", "n/a", ""}

# Cell values that mean the row exists for the day but trainer is excluded
# from the deployable pool (post-exit, on leave, etc.). Distinct from "free".
NON_DEPLOYABLE_VALUES: set[str] = {"exit", "exited", "left", "leave", "on leave"}


# Common column name variants to try when looking for a field
_FIELD_ALIASES: dict[str, list[str]] = {
    "name": ["trainer name", "name", "full name", "employee name", "trainer"],
    "email": ["email", "email id", "mail", "e-mail", "email address"],
    "phone": ["phone", "mobile", "contact", "phone no", "mobile no", "contact no"],
    "campus": ["campus", "location", "branch", "centre", "center", "city"],
    "status": ["status", "trainer status", "employment status", "active status"],
    "designation": ["designation", "role", "title", "position", "job title"],
    "department": ["department", "dept", "division", "team"],
    "skills": ["skills", "skill set", "expertise", "technologies", "tech stack", "specialization", "domain"],
    "employee_id": ["employee id", "emp id", "trainer id", "id", "staff id"],
    "joining_date": ["joining date", "doj", "date of joining", "join date", "joined"],
    "type": [
        "type", "trainer type", "category", "trainer category",
        "employment type", "engagement type", "employee type", "engagement",
    ],
}


# Canonical trainer-type buckets used by the date-blocking view.
# Matches the live "Trainer Data Live" sheet vocabulary (Validation sheet, col E):
#   Internal-Fulltime / Internal-SME / Internal-WILP / Internal-Exit /
#   Freelancer-Direct / Freelancer-Vendor / Freelancer-Contact / Freelancer
def normalize_type(value: str) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return ""
    compact = raw.replace(".", "").replace("-", " ").replace("_", " ")
    compact = " ".join(compact.split())

    # Freelancers (Direct / Vendor / Contact / plain)
    if "freelance" in compact or compact in {"flc", "external"}:
        return "FREELANCER"

    # Internal-Exit: count the row in the roster but treat as unavailable
    if "exit" in compact or "exited" in compact or "left" in compact:
        return "EXIT"

    # Internal-SME (Subject Matter Expert)
    if "sme" in compact or "subject matter" in compact:
        return "SME"

    # Internal-WILP (single bucket — the live sheet does not split BCA vs B.Tech)
    if "wilp" in compact:
        return "WILP"

    # Internal-Fulltime (a.k.a. FT) — also catches plain "fulltime", "full time", "ft"
    if (
        "fulltime" in compact
        or "full time" in compact
        or compact in {"ft", "internal", "permanent"}
    ):
        return "FT"

    # Unknown / unclassified — return uppercased original so it surfaces in the UI
    return value.strip().upper()


def _match_header(headers: list[str], field: str) -> str | None:
    """Return the actual header string that matches a logical field name."""
    aliases = _FIELD_ALIASES.get(field, [field])
    lower_headers = {h.lower(): h for h in headers}
    for alias in aliases:
        if alias.lower() in lower_headers:
            return lower_headers[alias.lower()]
    return None


def _find_header_row(rows: list[list[Any]]) -> int:
    """Locate the header row by looking for a 'Trainer Name' / 'Trainer Type' cell."""
    for idx, row in enumerate(rows[:10]):
        normalized = [normalize_text(c).lower() for c in row[:12]]
        if any("trainer name" == h or h == "name" for h in normalized):
            return idx
    return 0


def parse_trainer_sheet(rows: list[list[Any]]) -> dict[str, Any]:
    """Parse the Trainer Data Live sheet into a normalized trainer roster.

    The live sheet is a per-trainer × per-date pivot matrix:
      cols 1..N: trainer metadata (name, type, contact, vendor)
      cols N+1..: one column per date, cell value is the allotment string
                  ("Not alloted" → free, anything else → busy)

    Returns:
        {
          "headers": [...meta column names...],
          "trainers": [{ name, type, type_raw, ..., schedule: {iso: cell}, _raw }],
          "dates": [iso strings, sorted],
          "total": N,
        }
    """
    # First pass — use the generic parser to get the meta fields (for header detection)
    generic = parse_generic_sheet(rows)
    headers = generic["headers"]
    raw_rows = generic["rows"]

    field_map: dict[str, str | None] = {field: _match_header(headers, field) for field in _FIELD_ALIASES}

    def get(row: dict[str, str], field: str) -> str:
        col = field_map.get(field)
        return row.get(col, "") if col else ""

    # Second pass — walk raw rows to detect date columns and pivoted cell values.
    header_idx = _find_header_row(rows)
    raw_header = rows[header_idx] if header_idx < len(rows) else []
    name_col_idx: int | None = None
    type_col_idx: int | None = None
    date_columns: list[tuple[int, date]] = []
    seen_dates: set[date] = set()

    for col_idx, cell in enumerate(raw_header):
        text = normalize_text(cell)
        if not text and not isinstance(cell, (int, float)):
            continue
        lowered = text.lower()
        if name_col_idx is None and lowered in {"trainer name", "name", "full name", "employee name"}:
            name_col_idx = col_idx
            continue
        if type_col_idx is None and lowered in {"trainer type", "type", "category", "trainer category"}:
            type_col_idx = col_idx
            continue
        parsed = parse_date(cell)
        if parsed and parsed not in seen_dates:
            date_columns.append((col_idx, parsed))
            seen_dates.add(parsed)

    # Map normalized trainer-name → schedule dict (built from raw rows).
    schedule_by_name: dict[str, dict[str, str]] = {}
    if name_col_idx is not None and date_columns:
        for raw in rows[header_idx + 1:]:
            if name_col_idx >= len(raw):
                continue
            nm = normalize_text(raw[name_col_idx])
            if not nm:
                continue
            key = nm.lower()
            cells: dict[str, str] = {}
            for col_idx, day in date_columns:
                val = raw[col_idx] if col_idx < len(raw) else ""
                cells[day.isoformat()] = normalize_text(val)
            schedule_by_name[key] = cells

    trainers: list[dict[str, Any]] = []
    for row in raw_rows:
        name = get(row, "name")
        if not name:
            continue

        raw_type = get(row, "type")
        schedule = schedule_by_name.get(name.lower(), {})
        trainer: dict[str, Any] = {
            "name": name,
            "employee_id": get(row, "employee_id"),
            "email": get(row, "email"),
            "phone": get(row, "phone"),
            "campus": get(row, "campus"),
            "status": get(row, "status") or "Active",
            "designation": get(row, "designation"),
            "department": get(row, "department"),
            "skills": get(row, "skills"),
            "joining_date": get(row, "joining_date"),
            "type_raw": raw_type,
            "type": normalize_type(raw_type),
            "schedule": schedule,
            "_raw": row,
        }
        trainers.append(trainer)

    return {
        "headers": headers,
        "trainers": trainers,
        "dates": [d.isoformat() for _, d in date_columns],
        "total": len(trainers),
    }
