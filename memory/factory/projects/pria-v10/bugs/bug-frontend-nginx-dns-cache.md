# Bug — frontend nginx caches backend IP, breaks after backend restart

**Filed by:** Delivery Engineer (during Fix #4 verification)
**Date:** 2026-07-07
**Project:** pria-v10
**Severity:** medium (breaks login after every backend restart)
**Component:** `frontend.Dockerfile` → `/etc/nginx/conf.d/default.conf`

## Reproduction

1. `docker compose up -d` (all three containers fresh)
2. Login works: `POST http://localhost:8080/api/auth/login` → 200
3. `docker restart pria-backend` (simulate deploy / crash / OOM)
4. Wait for backend healthy
5. `POST http://localhost:8080/api/auth/login` → **502 Bad Gateway**
6. `docker logs pria-frontend` shows: `connect() failed (111: Connection refused) ... upstream: "http://172.19.0.3:3000/api/health"`
7. Direct call works: `POST http://localhost:3000/api/auth/login` → 200
8. From inside the frontend container: `wget http://pria-backend:3000/api/health` → 200 (network is fine)
9. `docker restart pria-frontend` → login works again

## Expected

Login through the frontend proxy continues to work after the backend container is restarted. Docker Compose service discovery should re-route automatically.

## Actual

The frontend's nginx resolves `pria-backend` to a numeric IP (e.g. `172.19.0.3`) at startup and caches that IP for the lifetime of the worker process. When the backend container is restarted, Docker assigns it a new IP. nginx keeps trying the old (now-dead) IP until the frontend container is also restarted.

## Root cause

`/etc/nginx/conf.d/default.conf` uses `proxy_pass http://pria-backend:3000;` without a `resolver` directive. When nginx is built with `--without-http_upstream_hash_module` style optimizations (or even with the standard module), the upstream hostname is resolved once at config load time and the resulting IP is baked into the worker. Without a `resolver` directive telling nginx where to do runtime DNS lookups, the IP is never refreshed.

Note: This is a known nginx + Docker Compose pitfall. The fix is documented in the official Docker docs and many production guides.

## Suggested fix (permanent)

Update `frontend.Dockerfile` / the nginx config to include a resolver. The Docker embedded DNS is at `127.0.0.11`:

```nginx
location /api/ {
    resolver 127.0.0.11 valid=10s;
    set $backend_upstream http://pria-backend:3000;
    proxy_pass $backend_upstream;
    # ... rest of the existing proxy_set_header directives stay the same
}
```

Alternatively, set the `docker-compose.yml` `pria-frontend` service to depend on `pria-backend` with `condition: service_healthy` and add a `restart: on-failure` policy on the backend so docker restarts them together.

## Impact

- Every backend restart currently breaks the frontend proxy
- In a production deploy, this would mean a rolling deploy of the backend breaks the UI for users until the frontend is also restarted
- Demo-blocking if a backend redeploy happens between login attempts

## Workaround

After every backend restart, also restart the frontend: `docker restart pria-frontend`.

## Status

Workaround applied at 2026-07-07 02:04 UTC. Permanent fix not yet applied (deferred to code-builder).
