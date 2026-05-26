from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.cache.store import cache
from app.logic.simulator import simulate_requirement

router = APIRouter()


class SimulateRequest(BaseModel):
    client: str = Field("", description="Client name (free text, optional)")
    tech_stack: str = Field("", description="Tech stack / skills query, e.g. 'Python, MERN'")
    start_date: str = Field(..., description="ISO YYYY-MM-DD")
    end_date: str = Field(..., description="ISO YYYY-MM-DD")
    demand: int = Field(1, ge=0, le=500, description="Number of trainers required")
    ta_demand: int = Field(0, ge=0, le=500, description="Number of TAs required")


@router.post("/simulate-requirement")
def post_simulate_requirement(body: SimulateRequest) -> dict[str, Any]:
    trainer_payload = cache.get("trainers", {"headers": [], "trainers": [], "total": 0})
    result = simulate_requirement(
        start_iso=body.start_date,
        end_iso=body.end_date,
        tech_stack=body.tech_stack,
        demand=body.demand,
        ta_demand=body.ta_demand,
        client=body.client,
        trainer_payload=trainer_payload,
    )
    return result
