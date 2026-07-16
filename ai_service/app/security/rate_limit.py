"""Lightweight in-memory rate limiter (fixed window).

Suitable for a single-process deployment. For horizontal scaling, swap the
backing store for Redis behind the same interface.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict

from app.exceptions import RateLimitExceeded
from app.settings import ApiSettings


class RateLimiter:
    _MAX_BUCKETS = 10_000

    def __init__(self, settings: ApiSettings) -> None:
        self._enabled = settings.rate_limit_enabled
        self._limit = settings.rate_limit_requests
        self._window = settings.rate_limit_window_seconds
        self._lock = threading.Lock()
        # key -> (window_start_epoch, count)
        self._buckets: dict[str, tuple[float, int]] = defaultdict(lambda: (0.0, 0))

    def check(self, key: str) -> None:
        if not self._enabled:
            return
        now = time.time()
        with self._lock:
            self._evict_stale(now)
            window_start, count = self._buckets[key]
            if now - window_start >= self._window:
                # Start a fresh window.
                self._buckets[key] = (now, 1)
                return
            if count >= self._limit:
                retry_after = int(self._window - (now - window_start)) + 1
                raise RateLimitExceeded(retry_after=retry_after)
            self._buckets[key] = (window_start, count + 1)

    def _evict_stale(self, now: float) -> None:
        stale_keys = [
            key for key, (window_start, _) in self._buckets.items()
            if now - window_start >= self._window
        ]
        for key in stale_keys:
            del self._buckets[key]
        if len(self._buckets) <= self._MAX_BUCKETS:
            return
        overflow = len(self._buckets) - self._MAX_BUCKETS
        oldest = sorted(self._buckets.items(), key=lambda item: item[1][0])[:overflow]
        for key, _ in oldest:
            del self._buckets[key]
