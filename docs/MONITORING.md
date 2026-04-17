# PRIA Monitoring Guide

## Railway Metrics

Railway automatically collects: CPU, memory, request count, latency percentiles, error rate.

View: Railway Dashboard → PRIAv5 → Metrics

## Prometheus Custom Metrics

PRIA exposes `/metrics` with:

| Metric | Type | Description |
|--------|------|-------------|
| `priia_http_requests_total` | Counter | HTTP requests by method/endpoint/status |
| `priia_http_request_duration_seconds` | Histogram | Request latency |
| `priia_gemini_calls_total` | Counter | Gemini calls by motor + cached |
| `priia_gemini_errors_total` | Counter | Gemini errors |
| `priia_cache_hits_total` | Counter | Cache hits |
| `priia_cache_misses_total` | Counter | Cache misses |
| `priia_active_jobs` | Gauge | Active Celery jobs |

## Grafana Setup

1. Create Grafana Cloud account (free tier)
2. Add Prometheus data source pointing to Railway's Prometheus endpoint
3. Import dashboard or create custom panels

## Example Grafana Panels

### Request Latency (p50, p95, p99)
```promql
histogram_quantile(0.50, rate(priia_http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(priia_http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(priia_http_request_duration_seconds_bucket[5m]))
```

### Error Rate
```promql
rate(priia_http_requests_total{status=~"5.."}[5m]) / rate(priia_http_requests_total[5m])
```

### Gemini Cache Hit Rate
```promql
rate(priia_cache_hits_total{cache_type="motor"}[5m]) /
(rate(priia_cache_hits_total{cache_type="motor"}[5m]) + rate(priia_cache_misses_total{cache_type="motor"}[5m]))
```

### Active Celery Jobs
```promql
priia_active_jobs
```

## Alerting Rules

```yaml
groups:
  - name: pria_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(priia_http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels: {severity: critical}
        annotations:
          summary: "High HTTP 5xx error rate"
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(priia_http_request_duration_seconds_bucket[5m])) > 2.0
        for: 5m
        labels: {severity: warning}
        annotations:
          summary: "High p95 latency"
      - alert: GeminiHighErrors
        expr: rate(priia_gemini_errors_total[5m]) > 0.05
        for: 1m
        labels: {severity: warning}
        annotations:
          summary: "High Gemini error rate"
```

## Sentry

Sentry is already configured. View at: sentry.io/organizations/pria

## Locust Load Tests

See `load_tests/README.md` for load testing with Locust.
