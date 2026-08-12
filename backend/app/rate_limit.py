"""Minimal in-process rate limiter for auth endpoints.

Production deployments should swap this for Redis-backed limiting; the interface
stays the same so only this module changes.
"""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

_HITS: dict[str, deque[float]] = defaultdict(deque)


def limit(request: Request, bucket: str, max_hits: int = 10, window_seconds: int = 60) -> None:
    client = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client}"
    now = time.time()
    hits = _HITS[key]
    while hits and now - hits[0] > window_seconds:
        hits.popleft()
    if len(hits) >= max_hits:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Wait a minute and try again.",
        )
    hits.append(now)


def reset() -> None:
    _HITS.clear()
