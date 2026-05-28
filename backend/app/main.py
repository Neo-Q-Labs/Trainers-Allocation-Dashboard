from __future__ import annotations

from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.cache.store import cache
from app.config import settings
from app.auth_utils import get_current_user
from app.routers import availability, calendar, clients, conflicts, date_blocking, deliveries, kpis, pending, workload, trainers, master, request_track, archive, simulator, oasis, auth
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

# Configure robust CORS middleware to allow cross-origin requests from Vercel and localhost
cors_origins = [origin for origin in settings.cors_origins_list if origin != "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex="https://.*\\.vercel\\.app|https://.*\\.onrender\\.com|http://localhost:.*|http://127.0.0.1:.*",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Public Auth Router
app.include_router(auth.router, prefix="/api/v1")

# Protected Dashboard Routers
app.include_router(kpis.router, prefix="/api/v1", tags=["KPIs"], dependencies=[Depends(get_current_user)])
app.include_router(availability.router, prefix="/api/v1", tags=["Availability"], dependencies=[Depends(get_current_user)])
app.include_router(deliveries.router, prefix="/api/v1", tags=["Deliveries"], dependencies=[Depends(get_current_user)])
app.include_router(conflicts.router, prefix="/api/v1", tags=["Conflicts"], dependencies=[Depends(get_current_user)])
app.include_router(pending.router, prefix="/api/v1", tags=["Pending"], dependencies=[Depends(get_current_user)])
app.include_router(workload.router, prefix="/api/v1", tags=["Workload"], dependencies=[Depends(get_current_user)])
app.include_router(clients.router, prefix="/api/v1", tags=["Clients"], dependencies=[Depends(get_current_user)])
app.include_router(calendar.router, prefix="/api/v1", tags=["Calendar"], dependencies=[Depends(get_current_user)])
app.include_router(trainers.router, prefix="/api/v1", tags=["Trainers"], dependencies=[Depends(get_current_user)])
app.include_router(master.router, prefix="/api/v1", tags=["Master Data"], dependencies=[Depends(get_current_user)])
app.include_router(request_track.router, prefix="/api/v1", tags=["Request Track"], dependencies=[Depends(get_current_user)])
app.include_router(archive.router, prefix="/api/v1", tags=["Archive"], dependencies=[Depends(get_current_user)])
app.include_router(date_blocking.router, prefix="/api/v1", tags=["Date Blocking"], dependencies=[Depends(get_current_user)])
app.include_router(simulator.router, prefix="/api/v1", tags=["Simulator"], dependencies=[Depends(get_current_user)])
app.include_router(oasis.router, prefix="/api/v1", tags=["OASIS"], dependencies=[Depends(get_current_user)])



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
