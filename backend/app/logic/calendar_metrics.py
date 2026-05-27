from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, date, timedelta, timezone
from typing import Any


def compute_calendar_metrics(parsed: dict[str, Any]) -> dict[str, Any]:
    """
    Derive calendar KPI metrics from parsed Excel data.

    Returns a dict shaped for the frontend calendarMetrics strip:
      - trainer_days_next30    : total assigned trainer-days in the next 30 calendar days
      - ta_days_next30         : placeholder (TA data not in Excel — returns 0)
      - peak_demand_day        : ISO date string of the busiest upcoming day
      - free_slots_next30      : deliveries with NO trainer in the next 30 days
      - active_pool_size       : distinct trainers with at least one assignment in window
      - daily_ceiling          : max trainer-assignments on any single day in window
    """
    assignments = parsed.get("assignments", [])
    records = parsed.get("records", [])

    today = date.today()
    window_end = today + timedelta(days=30)

    # Assignments within the next 30 days
    window_assignments: list[dict[str, Any]] = []
    for a in assignments:
        try:
            d = date.fromisoformat(a["date"])
        except (ValueError, KeyError):
            continue
        if today <= d <= window_end:
            window_assignments.append(a)

    # Count trainer-days (assignments with a trainer name)
    trainer_days = sum(1 for a in window_assignments if a.get("trainer"))

    # Day-level demand counter (all assignments, not just filled)
    day_counter: Counter[str] = Counter(a["date"] for a in window_assignments)
    # Filled days (with trainer)
    filled_day_counter: Counter[str] = Counter(
        a["date"] for a in window_assignments if a.get("trainer")
    )

    peak_day = day_counter.most_common(1)[0][0] if day_counter else str(today)
    daily_ceiling = day_counter.most_common(1)[0][1] if day_counter else 0

    # Free slots: deliveries in window with NO assigned trainer
    delivery_ids_in_window = {a["delivery_id"] for a in window_assignments}
    filled_deliveries_in_window = {a["delivery_id"] for a in window_assignments if a.get("trainer")}
    free_slots = len(delivery_ids_in_window - filled_deliveries_in_window)

    # Active pool: distinct trainers in window
    active_pool = {a["trainer"] for a in window_assignments if a.get("trainer")}

    return {
        "trainer_days_next30": trainer_days,
        "ta_days_next30": 0,  # TA data not available in Excel
        "peak_demand_day": peak_day,
        "free_slots_next30": free_slots,
        "active_pool_size": len(active_pool),
        "daily_ceiling": daily_ceiling,
    }


def compute_calendar_data(parsed: dict[str, Any], year: int, month: int = None) -> dict[str, Any]:
    """
    Compute calendar data for the frontend calendar views.
    Returns daily events, demand levels, and programme information.
    """
    assignments = parsed.get("assignments", [])
    records = parsed.get("records", [])
    
    # Filter assignments by year/month
    filtered_assignments = []
    for a in assignments:
        try:
            d = date.fromisoformat(a["date"])
            if d.year == year and (month is None or d.month == month):
                filtered_assignments.append({**a, "parsed_date": d})
        except (ValueError, KeyError):
            continue
    
    # Group by date
    daily_data = defaultdict(lambda: {
        "date": "",
        "demand": 0,
        "events": [],
        "trainers": set(),
        "programmes": set()
    })
    
    for a in filtered_assignments:
        date_str = a["date"]
        daily_data[date_str]["date"] = date_str
        daily_data[date_str]["demand"] += 1
        
        # Extract programme info
        programme = {
            "name": a.get("course_name", "Unknown Course"),
            "delivery_id": a.get("delivery_id", ""),
            "trainer": a.get("trainer", ""),
            "campus": a.get("campus", ""),
            "track": _extract_track(a),
            "client": _extract_client(a)
        }
        
        daily_data[date_str]["events"].append(programme)
        if programme["trainer"]:
            daily_data[date_str]["trainers"].add(programme["trainer"])
        daily_data[date_str]["programmes"].add(programme["delivery_id"])
    
    # Convert sets to counts and clean up
    calendar_data = {}
    for date_str, data in daily_data.items():
        calendar_data[date_str] = {
            "date": date_str,
            "demand": data["demand"],
            "events": data["events"],
            "trainer_count": len(data["trainers"]),
            "programme_count": len(data["programmes"])
        }
    
    # Calculate summary metrics
    total_trainer_days = sum(len(data["trainers"]) for data in daily_data.values())
    total_ta_days = 0  # Not available in current data
    peak_date = max(daily_data.keys(), key=lambda d: daily_data[d]["demand"]) if daily_data else None
    free_slots = sum(1 for data in daily_data.values() for event in data["events"] if not event["trainer"])
    active_trainers = set()
    for data in daily_data.values():
        active_trainers.update(data["trainers"])
    
    return {
        "calendar_data": calendar_data,
        "summary": {
            "trainer_days_total": total_trainer_days,
            "ta_days_total": total_ta_days,
            "peak_demand_date": peak_date,
            "free_slots_total": free_slots,
            "active_pool_size": len(active_trainers),
            "daily_ceiling": max((data["demand"] for data in daily_data.values()), default=0)
        }
    }


def compute_week_data(parsed: dict[str, Any], target_date: str) -> dict[str, Any]:
    """
    Compute detailed week data for a specific date.
    Returns 7 days of data centered around the target date.
    """
    try:
        target = date.fromisoformat(target_date)
    except ValueError:
        target = date.today()
    
    # Get start of week (Sunday)
    days_since_sunday = target.weekday() % 7
    if target.weekday() == 6:  # Sunday
        days_since_sunday = 0
    else:
        days_since_sunday = target.weekday() + 1
    
    week_start = target - timedelta(days=days_since_sunday)
    
    assignments = parsed.get("assignments", [])
    week_data = []
    programmes_this_week = defaultdict(int)
    
    for i in range(7):
        current_date = week_start + timedelta(days=i)
        date_str = current_date.isoformat()
        
        day_assignments = [a for a in assignments if a.get("date") == date_str]
        
        events = []
        for a in day_assignments:
            programme = {
                "name": a.get("course_name", "Unknown Course"),
                "delivery_id": a.get("delivery_id", ""),
                "trainer": a.get("trainer", ""),
                "track": _extract_track(a),
                "client": _extract_client(a)
            }
            events.append(programme)
            if programme["delivery_id"]:
                programmes_this_week[programme["delivery_id"]] += 1
        
        week_data.append({
            "date": date_str,
            "day_name": current_date.strftime("%A"),
            "day_num": current_date.day,
            "demand": len(day_assignments),
            "programme_count": len(set(a.get("delivery_id") for a in day_assignments if a.get("delivery_id"))),
            "events": events,
            "is_weekend": current_date.weekday() >= 5
        })
    
    # Programme summary
    programme_summary = []
    for delivery_id, days in programmes_this_week.items():
        # Find programme details
        sample_assignment = next((a for a in assignments if a.get("delivery_id") == delivery_id), {})
        programme_summary.append({
            "delivery_id": delivery_id,
            "name": sample_assignment.get("course_name", "Unknown Course"),
            "track": _extract_track(sample_assignment),
            "client": _extract_client(sample_assignment),
            "days_this_week": days
        })
    
    return {
        "week_start": week_start.isoformat(),
        "week_data": week_data,
        "programmes": sorted(programme_summary, key=lambda x: x["days_this_week"], reverse=True)
    }


def compute_gantt_data(parsed: dict[str, Any], start_date: str, days: int) -> dict[str, Any]:
    """
    Compute trainer gantt data for the calendar gantt view.
    """
    try:
        start = date.fromisoformat(start_date)
    except ValueError:
        start = date.today()
    
    end = start + timedelta(days=days - 1)
    assignments = parsed.get("assignments", [])
    
    # Filter assignments in date range
    gantt_assignments = []
    for a in assignments:
        try:
            d = date.fromisoformat(a["date"])
            if start <= d <= end:
                gantt_assignments.append({**a, "parsed_date": d})
        except (ValueError, KeyError):
            continue
    
    # Group by trainer
    trainer_data = defaultdict(lambda: {
        "name": "",
        "id": "",
        "type": "Internal",
        "assignments": []
    })
    
    for a in gantt_assignments:
        trainer = a.get("trainer", "")
        if not trainer:
            continue
            
        trainer_data[trainer]["name"] = trainer
        trainer_data[trainer]["id"] = f"neo{hash(trainer) % 10000:05d}"  # Generate ID
        trainer_data[trainer]["assignments"].append({
            "date": a["date"],
            "programme": a.get("course_name", "Unknown Course"),
            "delivery_id": a.get("delivery_id", ""),
            "track": _extract_track(a),
            "client": _extract_client(a),
            "campus": a.get("campus", ""),
            "day_offset": (a["parsed_date"] - start).days
        })
    
    # Convert to list and sort
    trainers = []
    for trainer_name, data in trainer_data.items():
        # Group consecutive assignments into bars
        bars = _create_gantt_bars(data["assignments"], start)
        trainers.append({
            "name": data["name"],
            "id": data["id"],
            "type": data["type"],
            "bars": bars
        })
    
    trainers.sort(key=lambda x: x["name"])
    
    return {
        "start_date": start_date,
        "days": days,
        "trainers": trainers
    }


def _extract_track(assignment: dict) -> str:
    """Extract track from the full assignment dict.

    Scans training_category, course_name, and cell_value (the raw assignment
    text like 'SKG-MERN-Trainer') using the same rich patterns as the Matrix
    page so the Calendar track dropdown reflects live data.
    """
    import re
    text = " ".join(filter(None, [
        str(assignment.get("training_category", "") or ""),
        str(assignment.get("course_name", "") or ""),
        str(assignment.get("cell_value", "") or ""),
    ])).lower()

    if re.search(r'\b(java[\s_-]?fs|java[\s_-]?full|jfs|mern|mean|spring[\s_-]?boot|j2ee|java)\b', text):
        return "java"
    if re.search(r'\b(python|machine[\s_-]?learning|\bml\b|data[\s_-]?sci|gen[\s_-]?ai|genai|\bai\b|\bnlp\b)\b', text):
        return "python"
    if re.search(r'(\.net|dotnet|\bnet\b|azure|\baws\b|\bgcp\b|cloud|devops|kubernetes)', text):
        return "cloud"
    if re.search(r'\b(react|angular|frontend|front[\s_-]?end|javascript|node\.?js|vue|html|css)\b', text):
        return "react"
    if re.search(r'\b(test|qa\b|sdet|selenium|quality[\s_-]?assur|automation)\b', text):
        return "testing"
    if re.search(r'\b(data[\s_-]?analytics|data[\s_-]?eng|analytics|power[\s_-]?bi|tableau)\b', text):
        return "data"
    if re.search(r'\b(cyber|security|infosec|ethical[\s_-]?hack)\b', text):
        return "cyber"
    if re.search(r'\b(sap|abap|hana|fico|s\/4)\b', text):
        return "sap"
    if re.search(r'\b(sql|database|mysql|oracle|plsql|mongo|postgres)\b', text):
        return "data"
    if re.search(r'\b(dsa|data[\s_-]?struct|algorithm|aptitude|quant|reasoning|verbal|soft[\s_-]?skill)\b', text):
        return "other"
    return "other"


def _extract_client(assignment: dict) -> str:
    """Extract client key from the full assignment dict.

    Scans campus, course_name, and cell_value for known client tokens so that
    assignments written as 'SKG-MERN-Trainer' map to the correct client.
    """
    text = " ".join(filter(None, [
        str(assignment.get("campus", "") or ""),
        str(assignment.get("course_name", "") or ""),
        str(assignment.get("cell_value", "") or ""),
    ])).lower()

    if "parul" in text:
        return "parul"
    if "skg" in text or "sri krishna" in text:
        return "skg"
    if "lti" in text or "ltimindtree" in text or "mindtree" in text:
        return "lti"
    if "kct" in text:
        return "kct"
    if "hexaware" in text:
        return "hexaware"
    if "iamneo" in text or "iamneo" in text:
        return "iamneo"
    return "other"


def _create_gantt_bars(assignments: list[dict], start_date: date) -> list[dict]:
    """Create gantt bars from assignments"""
    if not assignments:
        return []
    
    # Sort by date
    assignments.sort(key=lambda x: x["date"])
    
    bars = []
    current_bar = None
    
    for assignment in assignments:
        day_offset = assignment["day_offset"]
        
        if current_bar is None:
            current_bar = {
                "track": assignment["track"],
                "programme": assignment["programme"],
                "start_day": day_offset + 1,  # 1-based
                "span": 1
            }
        elif (current_bar["programme"] == assignment["programme"] and 
              day_offset == current_bar["start_day"] + current_bar["span"] - 1):
            # Extend current bar
            current_bar["span"] += 1
        else:
            # Start new bar
            bars.append(current_bar)
            current_bar = {
                "track": assignment["track"],
                "programme": assignment["programme"],
                "start_day": day_offset + 1,  # 1-based
                "span": 1
            }
    
    if current_bar:
        bars.append(current_bar)
    
    return bars
