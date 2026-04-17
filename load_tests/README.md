# PRIA Load Tests

## Quick Start

```bash
pip install locust
locust -f load_tests/locustfile.py --host=http://localhost:8000
# Open http://localhost:8089
```

## Against Railway

```bash
locust -f load_tests/locustfile.py --host=https://priav5-production.up.railway.app --headless -u 20 -r 5 -t 60s
```

## Scenarios

| Scenario | Users | Spawn Rate | Duration |
|----------|-------|------------|----------|
| Smoke | 5 | 1/s | 30s |
| Normal | 20 | 2/s | 2min |
| Peak | 100 | 10/s | 5min |

## KPIs

- p50 latency < 500ms
- p95 latency < 2s
- Error rate < 1%

## User Classes

| Class | Weight | Behavior |
|-------|--------|----------|
| `PRIAUser` | 70% | Authenticated teacher - get/save plans |
| `AnonymousUser` | 20% | Health checks, failed logins |
| `PRIAAdmin` | 10% | Admin operations |

## Running Specific Tests

```bash
# Smoke test
locust -f load_tests/locustfile.py --headless -u 5 -r 1 -t 30s --host=http://localhost:8000

# Peak load test
locust -f load_tests/locustfile.py --headless -u 100 -r 10 -t 300s --host=http://localhost:8000

# With CSV output
locust -f load_tests/locustfile.py --headless -u 20 -r 2 -t 60s --host=http://localhost:8000 --csv=/tmp/locust_results
```
