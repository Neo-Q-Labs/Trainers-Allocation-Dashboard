from __future__ import annotations

from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.cache.store import cache
from app.config import settings
from app.routers import availability, calendar, clients, conflicts, date_blocking, deliveries, kpis, pending, workload, trainers, master, request_track, archive, simulator, oasis
from app.scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(
    title="Trainer Allotment API",
    description="Qlab's Swif ops - Trainer Dashboard backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(kpis.router, prefix="/api/v1", tags=["KPIs"])
app.include_router(availability.router, prefix="/api/v1", tags=["Availability"])
app.include_router(deliveries.router, prefix="/api/v1", tags=["Deliveries"])
app.include_router(conflicts.router, prefix="/api/v1", tags=["Conflicts"])
app.include_router(pending.router, prefix="/api/v1", tags=["Pending"])
app.include_router(workload.router, prefix="/api/v1", tags=["Workload"])
app.include_router(clients.router, prefix="/api/v1", tags=["Clients"])
app.include_router(calendar.router, prefix="/api/v1", tags=["Calendar"])
app.include_router(trainers.router, prefix="/api/v1", tags=["Trainers"])
app.include_router(master.router, prefix="/api/v1", tags=["Master Data"])
app.include_router(request_track.router, prefix="/api/v1", tags=["Request Track"])
app.include_router(archive.router, prefix="/api/v1", tags=["Archive"])
app.include_router(date_blocking.router, prefix="/api/v1", tags=["Date Blocking"])
app.include_router(simulator.router, prefix="/api/v1", tags=["Simulator"])
app.include_router(oasis.router, prefix="/api/v1", tags=["OASIS"])


@app.get("/")
def root():
    return {
        "message": "Trainer Allotment API is running successfully.",
        "documentation": "/docs",
        "health_check": "/health"
    }


@app.get("/health")
def health():
    parsed = cache.get("parsed", {"records": [], "assignments": []})
    trainers = cache.get("trainers", {"total": 0})
    return {
        "status": "ok" if cache.is_ready else "warming",
        "last_sync": cache.last_updated,
        "records_cached": len(parsed.get("assignments", [])),
        "trainer_roster_count": trainers.get("total", 0),
        "source": cache.source,
        "error": cache.error,
    }
