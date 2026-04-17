# Escalado: activar FastAPI + Celery + Redis cuando haga falta

Este documento describe **cuándo** y **cómo** activar la infra de escalado (FastAPI, Celery, Redis) que OpenCode dejó implementada pero dormida.

## TL;DR — Hoy no hace falta

Con 20 profes del colegio la app Streamlit standalone (modo `USE_API=false`, `USE_CELERY=false`) aguanta sin problemas. FastAPI + Celery + Redis agregan complejidad operativa sin beneficio perceptible a esa escala.

**Activar cuando**:
- Más de 50 usuarios concurrentes, **o**
- Se quiere una app móvil / integración externa que consuma la API REST, **o**
- La generación de Gemini bloquea la UI > 10s con frecuencia (→ async jobs + websocket)

## 1. Topología de 3 servicios en Railway

```
┌────────────────┐       ┌──────────────┐       ┌──────────────┐
│  web (streamlit)│──────▶│   api (FastAPI)│──────▶│  postgres    │
│  port=$PORT    │       │  port=$PORT   │       └──────────────┘
└────────────────┘       └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐       ┌──────────────┐
                         │ worker (celery)│──────▶│    redis     │
                         └──────────────┘       └──────────────┘
```

Railway permite múltiples servicios en un mismo proyecto; cada uno con su propio `$PORT` y dominio.

## 2. Pasos concretos

### 2.1 Añadir Postgres

Railway UI → Add Plugin → Postgres. Copiar `DATABASE_URL` al servicio `web` y `api`. El código ya detecta PG (`db/_base.py` líneas ~27-30).

Migrar datos:

```bash
# Export SQLite
sqlite3 pria_estado.db .dump > dump.sql

# Clean SQLite-only syntax (CREATE TABLE IF NOT EXISTS is ok, AUTOINCREMENT → SERIAL manual)
# Import al Postgres de Railway
railway run --service postgres psql < dump_cleaned.sql
```

### 2.2 Añadir Redis

Railway UI → Add Plugin → Redis. Copiar:
- `REDIS_URL` → servicio `web` (cache)
- `CELERY_BROKER_URL=$REDIS_URL` → servicios `api` y `worker`

### 2.3 Servicio `api` separado

Crear nuevo servicio en Railway desde el mismo repo con:
- **Start command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- **Env**:
  - `JWT_SECRET_KEY` (mismo valor en web y api)
  - `DATABASE_URL` (desde Postgres plugin)
  - `REDIS_URL`

Dominio: `api.laspalmas.edu.bo` (CNAME).

### 2.4 Servicio `worker` separado

Crear servicio sin dominio público con:
- **Start command**: `celery -A workers.celery_app worker --loglevel=info --concurrency=2`
- **Env**: mismas que `api` + `USE_CELERY=true`

### 2.5 Activar en web

En el servicio `web` poner:
- `USE_API=true`
- `PRIA_API_URL=https://api.laspalmas.edu.bo`
- `USE_CELERY=true`

`lib/api_client.py` empieza a rutear HTTP hacia `api` en vez de llamar a db/gemini directo.

## 3. Verificación

```bash
curl https://api.laspalmas.edu.bo/health        # → {"status":"ok"}
curl https://api.laspalmas.edu.bo/metrics       # → Prometheus text
# Login y pedir /me
TOKEN=$(curl -s -X POST https://api.laspalmas.edu.bo/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"ruddy@laspalmas.edu","password":"..."}' | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" https://api.laspalmas.edu.bo/auth/me
```

## 4. Rollback

Poner `USE_API=false` en `web`. Streamlit vuelve al modo standalone sin reiniciar los otros servicios. Los servicios `api`/`worker`/`redis` pueden quedarse apagados o eliminados.

## 5. Monitoreo

- `/metrics` en `api` → scrapear con Grafana Cloud (free tier). Ya está la config en `docs/MONITORING.md`.
- Sentry: `SENTRY_DSN` en los 3 servicios.
- Railway logs: `railway logs --service api --tail`.

## 6. Costo estimado (Railway, pilot-tier)

| Recurso | USD/mes |
|---|---|
| web (streamlit, 512MB) | ~5 |
| api (fastapi, 256MB) | ~3 |
| worker (celery, 256MB) | ~3 |
| postgres (starter) | ~5 |
| redis (starter) | ~5 |
| **Total** | **~21** |

vs. modo standalone actual: ~5 USD/mes (solo web).

Conclusión: pagar 4× para dar soporte a integraciones externas o > 50 usuarios. No antes.
