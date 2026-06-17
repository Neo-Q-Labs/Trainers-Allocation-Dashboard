from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.graph.excel_reader import fetch_and_refresh

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def start_scheduler() -> None:
    fetch_and_refresh()
    scheduler.add_job(
        fetch_and_refresh,
        trigger="interval",
        seconds=settings.POLL_INTERVAL_SECONDS,
        id="excel_poll",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.start()


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
