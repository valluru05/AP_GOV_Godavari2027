"""
In-memory sliding window rate limiter for CivicProof API authentication and sensitive endpoints.
Designed for thread-safe production protection against brute-force credential stuffing and DoS attacks.
"""

import os
import time
from collections import defaultdict
from threading import Lock
from typing import Dict, List, Tuple
from fastapi import HTTPException, Request, status
from app.core.config import settings


class SlidingWindowRateLimiter:
    def __init__(self):
        self._lock = Lock()
        # Maps key -> list of timestamp floats
        self._records: Dict[str, List[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup_expired(self, current_time: float, window_seconds: int):
        """Periodically purges old records to prevent unbounded memory growth."""
        if current_time - self._last_cleanup < 60:
            return
        
        expired_cutoff = current_time - window_seconds
        keys_to_delete = []
        for key, timestamps in self._records.items():
            valid_stamps = [t for t in timestamps if t > expired_cutoff]
            if valid_stamps:
                self._records[key] = valid_stamps
            else:
                keys_to_delete.append(key)
        
        for k in keys_to_delete:
            del self._records[k]
        self._last_cleanup = current_time

    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, int]:
        """
        Validates whether a request with the given key is within rate limits.
        Returns: (is_allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            self._cleanup_expired(now, window_seconds)
            timestamps = self._records[key]
            
            # Filter timestamps in current sliding window
            timestamps = [t for t in timestamps if t > cutoff]
            self._records[key] = timestamps

            if len(timestamps) >= max_requests:
                # Calculate retry-after duration
                earliest_stamp = timestamps[0]
                retry_after = max(1, int(window_seconds - (now - earliest_stamp)))
                return False, retry_after

            timestamps.append(now)
            return True, 0


# Global rate limiter instance
limiter = SlidingWindowRateLimiter()


def enforce_rate_limit(
    request: Request,
    max_requests: int = 20,
    window_seconds: int = 60,
    key_prefix: str = "ip"
):
    """
    FastAPI dependency or helper to enforce rate limiting on high-risk endpoints.
    Bypassed automatically during automated pytest executions.
    """
    if (
        not settings.RATE_LIMIT_ENABLED
        or settings.ENVIRONMENT == "test"
        or os.getenv("PYTEST_CURRENT_TEST")
    ):
        return

    client_ip = request.client.host if request.client else "unknown"
    key = f"{key_prefix}:{client_ip}"
    
    is_allowed, retry_after = limiter.check_rate_limit(
        key=key,
        max_requests=max_requests,
        window_seconds=window_seconds
    )

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Too many requests. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )
