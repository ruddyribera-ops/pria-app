"""
api/monitoring.py — Prometheus Metrics for PRIA API
====================================================
Exposes custom metrics for monitoring HTTP requests, Gemini calls, and cache performance.
"""

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from starlette.middleware.base import BaseHTTPMiddleware
import time

REQUEST_COUNT = Counter(
    "priia_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "priia_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

GEMINI_CALLS = Counter(
    "priia_gemini_calls_total",
    "Total Gemini API calls",
    ["motor", "cached"],
)

GEMINI_ERRORS = Counter(
    "priia_gemini_errors_total",
    "Total Gemini API errors",
    ["motor"],
)

CACHE_HITS = Counter("priia_cache_hits_total", "Total cache hits", ["cache_type"])
CACHE_MISSES = Counter("priia_cache_misses_total", "Total cache misses", ["cache_type"])

ACTIVE_JOBS = Gauge("priia_active_jobs", "Number of active Celery jobs")


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to track HTTP request metrics."""

    async def dispatch(self, request, call_next):
        if request.url.path == "/metrics":
            return await call_next(request)

        method = request.method
        endpoint = self._normalize(request.url.path)
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        REQUEST_COUNT.labels(
            method=method, endpoint=endpoint, status=response.status_code
        ).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
        return response

    def _normalize(self, path: str) -> str:
        """Normalize paths with IDs to avoid high cardinality."""
        parts = path.split("/")
        out = []
        for p in parts:
            # UUIDs and long hex strings -> {id}
            if len(p) >= 24 and all(c in "0123456789abcdef-" for c in p.lower()):
                out.append("{id}")
            # Numeric IDs >= 6 digits -> {id}
            elif p.isdigit() and len(p) >= 6:
                out.append("{id}")
            else:
                out.append(p)
        return "/".join(out)


def record_gemini(motor: str, cached: bool, success: bool):
    """Record a Gemini API call."""
    GEMINI_CALLS.labels(motor=motor, cached=str(cached).lower()).inc()
    if not success:
        GEMINI_ERRORS.labels(motor=motor).inc()


def record_cache_hit(cache_type: str):
    """Record a cache hit."""
    CACHE_HITS.labels(cache_type=cache_type).inc()


def record_cache_miss(cache_type: str):
    """Record a cache miss."""
    CACHE_MISSES.labels(cache_type=cache_type).inc()
