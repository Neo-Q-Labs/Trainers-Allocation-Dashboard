from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any


class DashboardCache:
    """Thread-safe in-memory cache for processed dashboard data."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._data: dict[str, Any] = {}
        self.last_updated: datetime | None = None
        self.is_ready = False
        self.source = "empty"
        self.error: str | None = None

    def set_all(self, payload: dict[str, Any], source: str = "graph", error: str | None = None) -> None:
        with self._lock:
            self._data.update(payload)
            self.last_updated = datetime.now(timezone.utc)
            self.is_ready = True
            self.source = source
            self.error = error

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._data.get(key, default)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._data)


cache = DashboardCache()
