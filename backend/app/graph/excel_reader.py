from __future__ import annotations

import logging
from typing import Any

# pyrefly: ignore [missing-import]
import httpx

from app.cache.store import cache
from app.config import settings
from app.graph.auth import get_access_token
from app.logic.availability import build_availability
from app.logic.calendar_metrics import compute_calendar_metrics
from app.logic.clients import compute_clients
from app.logic.conflicts import detect_conflicts
from app.logic.kpis import compute_kpis
from app.logic.pending import compute_pending
from app.logic.pipeline import build_campus_stats, build_pipeline
from app.logic.workload import compute_workload
from app.parser.allotment_parser import (
    merge_sheet_rows,
    parse_excel_rows,
    parse_generic_sheet,
    read_csv_rows,
)
from app.parser.trainer_parser import parse_trainer_sheet

logger = logging.getLogger(__name__)
BASE_URL = "https://graph.microsoft.com/v1.0"


# ---------------------------------------------------------------------------
# Graph API helpers
# ---------------------------------------------------------------------------

def _fetch_sheet_rows(sheet_name: str, token: str) -> list[list[Any]]:
    """Fetch the usedRange values for a single worksheet by name."""
    headers = {"Authorization": f"Bearer {token}"}
    url = (
        f"{BASE_URL}/drives/{settings.SHAREPOINT_DRIVE_ID}"
        f"/items/{settings.EXCEL_FILE_ID}"
        f"/workbook/worksheets/{sheet_name}/usedRange"
        "?$select=values"
    )
    with httpx.Client(timeout=30) as client:
        response = client.get(url, headers=headers)
        response.raise_for_status()
    return response.json().get("values", [])


def fetch_excel_rows() -> list[list[Any]]:
    """Fetch and merge all allotment sheets into a single row-list."""
    token = get_access_token()
    all_rows: list[list[list[Any]]] = []
    for sheet_name in settings.allotment_sheets_list:
        try:
            rows = _fetch_sheet_rows(sheet_name, token)
            if rows:
                all_rows.append(rows)
                logger.info("Fetched %d rows from sheet '%s'", len(rows), sheet_name)
        except Exception as exc:
            logger.warning("Could not fetch sheet '%s': %s", sheet_name, exc)
    return merge_sheet_rows(all_rows)


def _fetch_auxiliary_sheet(sheet_name: str, token: str) -> list[list[Any]]:
    """Fetch an auxiliary (non-allotment) sheet, returning [] on failure."""
    try:
        rows = _fetch_sheet_rows(sheet_name, token)
        logger.info("Fetched %d rows from auxiliary sheet '%s'", len(rows), sheet_name)
        return rows
    except Exception as exc:
        logger.warning("Could not fetch auxiliary sheet '%s': %s", sheet_name, exc)
        return []


# ---------------------------------------------------------------------------
# Payload builder
# ---------------------------------------------------------------------------

def _build_payload(
    allotment_rows: list[list[Any]],
    trainer_rows: list[list[Any]],
    master_rows: list[list[Any]],
    request_track_rows: list[list[Any]],
    archive_rows: list[list[Any]],
) -> dict[str, Any]:
    parsed = parse_excel_rows(allotment_rows)
    conflicts = detect_conflicts(parsed)

    # Parse archive as allotment data (same schema)
    archive_parsed: dict[str, Any] = {"records": [], "assignments": [], "date_columns": []}
    if archive_rows:
        try:
            archive_parsed = parse_excel_rows(archive_rows)
        except Exception as exc:
            logger.warning("Archive sheet parse error: %s", exc)

    # Parse auxiliary sheets generically
    trainer_data = parse_trainer_sheet(trainer_rows) if trainer_rows else {"headers": [], "trainers": [], "total": 0}
    master_data = parse_generic_sheet(master_rows) if master_rows else {"headers": [], "rows": []}
    request_track_data = parse_generic_sheet(request_track_rows) if request_track_rows else {"headers": [], "rows": []}

    return {
        "parsed": parsed,
        "kpis": compute_kpis(parsed, conflicts, trainer_roster=trainer_data),
        "availability": build_availability(parsed, days=180),
        "deliveries": build_pipeline(parsed),
        "conflicts": conflicts,
        "campus_stats": build_campus_stats(parsed),
        "pending": compute_pending(parsed),
        "workload": compute_workload(parsed),
        "clients": compute_clients(parsed, conflicts),
        "calendar_metrics": compute_calendar_metrics(parsed),
        # New multi-sheet data
        "trainers": trainer_data,
        "master_data": master_data,
        "request_track": request_track_data,
        "archive": {
            "records": archive_parsed.get("records", []),
            "total": len(archive_parsed.get("records", [])),
        },
    }


# ---------------------------------------------------------------------------
# Main refresh entry point
# ---------------------------------------------------------------------------

def fetch_and_refresh() -> None:
    source = "graph"
    graph_error: str | None = None

    if not settings.graph_configured:
        graph_error = "Graph credentials are not configured."
        logger.warning("Graph refresh skipped; using local CSV fallback.")
        allotment_rows = read_csv_rows(settings.LOCAL_CSV_PATH)
        trainer_rows: list[list[Any]] = []
        master_rows: list[list[Any]] = []
        request_track_rows: list[list[Any]] = []
        archive_rows: list[list[Any]] = []
        source = "local_csv"
    else:
        try:
            token = get_access_token()
            allotment_rows = fetch_excel_rows()
            trainer_rows = _fetch_auxiliary_sheet(settings.TRAINER_SHEET, token)
            master_rows = _fetch_auxiliary_sheet(settings.MASTER_SHEET, token)
            request_track_rows = _fetch_auxiliary_sheet(settings.REQUEST_TRACK_SHEET, token)
            archive_rows = _fetch_auxiliary_sheet(settings.ARCHIVE_SHEET, token)
        except Exception as exc:
            graph_error = str(exc)
            logger.warning("Graph refresh failed; using local CSV fallback: %s", exc)
            allotment_rows = read_csv_rows(settings.LOCAL_CSV_PATH)
            trainer_rows = []
            master_rows = []
            request_track_rows = []
            archive_rows = []
            source = "local_csv"

    payload = _build_payload(
        allotment_rows,
        trainer_rows,
        master_rows,
        request_track_rows,
        archive_rows,
    )
    cache.set_all(payload, source=source, error=graph_error)
