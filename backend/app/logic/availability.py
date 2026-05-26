from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any


def build_availability(parsed: dict[str, Any], days: int = 7) -> dict[str, Any]:
    assignments = [item for item in parsed["assignments"] if item.get("trainer")]
    if not assignments:
        return {"days": [], "trainers": [], "grid": []}

    all_dates = sorted({date.fromisoformat(item["date"]) for item in assignments})
    today = date.today()
    start = min((day for day in all_dates if day >= today), default=all_dates[0])
    selected_days = [start + timedelta(days=offset) for offset in range(days)]
    by_trainer_day: dict[tuple[str, date], list[dict[str, Any]]] = defaultdict(list)

    for item in assignments:
        by_trainer_day[(item["trainer"], date.fromisoformat(item["date"]))].append(item)

    trainers = sorted({item["trainer"] for item in assignments})[:12]
    grid = []
    for trainer in trainers:
        cells = []
        for day in selected_days:
            items = by_trainer_day.get((trainer, day), [])
            state = "free"
            if day.weekday() >= 5:
                state = "weekend"
            if len(items) == 1:
                state = "assigned"
            elif len(items) > 1:
                state = "overload"
            cells.append(
                {
                    "date": day.isoformat(),
                    "day": day.strftime("%a"),
                    "state": state,
                    "count": len(items),
                    "delivery_ids": sorted({item["delivery_id"] for item in items}),
                    "campuses": sorted({item["campus"] for item in items if item.get("campus")}),
                }
            )
        grid.append({"trainer": trainer, "cells": cells})

    return {
        "days": [{"date": day.isoformat(), "label": day.strftime("%a")} for day in selected_days],
        "trainers": trainers,
        "grid": grid,
    }
