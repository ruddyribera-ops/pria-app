# Escalado: activar FastAPI + Celery + Redis cuando haga falta

Este documento describe **cómo** activar la infra de escalado que OpenCode dejó implementada pero dormida.

## TL;DR — Hoy no hace falta

Con 17 profes del colegio la app Streamlit standalone (modo `USE_API=false`) aguanta sin problemas.
FastAPI + Celery + Redis se activan cuando hay >50 usuarios o se necesita API pública.

---

## Dos caminos de despliegue

| Camino | Complexity | FastAPI accesible | Celery | Cuándo |
|--------|------------|-------------------|--------|--------|
| **A — Single-service** (este doc, sección 2) | Baja | No (interno solo) | Sí (con Upstash) | Hoy, rápido |
| **B — Multi-servicio** (sección 3) | Alta | Sí (dominio propio) | Sí | >50 usuarios, API pública |

---

## Camino A: Single-service (FastAPI interno + Celery)

En este modo FastAPI corre en `:8000` **dentro** del mismo contenedor que Streamlit.
No es accesible desde fuera, pero Streamlit lo usa para todas sus operaciones internas.

### Paso 1 — Crear cuenta en Upstash Redis

1. Ve a [upstash.com](https://upstash.com) → Register (gratis)
2. Crea un database → choose "Redis" → "Global" region
3. Copia la variable `REDIS_URL` (formato: `redis://xxx.upstash.io:6379`)

### Paso 2 — Configurar variables en Railway

```bash
# FastAPI + Streamlit (single-service mode)
railway variable set USE_API=true
railway variable set API_BASE_URL=http://localhost:8000

# Celery + Redis (Upstash)
railway variable set USE_CELERY=true
railway variable set CELERY_BROKER_URL=<tu REDIS_URL de Upstash>
railway variable set REDIS_URL=<tu REDIS_URL de Upstash>
```

**O desde el dashboard de Railway** (railway.app → PRIAv5 → Variables):

| Variable | Valor |
|----------|-------|
| `USE_API` | `true` |
| `API_BASE_URL` | `http://localhost:8000` |
| `USE_CELERY` | `true` |
| `CELERY_BROKER_URL` | `redis://xxx.upstash.io:6379` (tu URL de Upstash) |
| `REDIS_URL` | `redis://xxx.upstash.io:6379` |

### Paso 3 — Redeploy

```bash
railway up --detach
```

### Paso 4 — Verificar

```bash
# El health check de FastAPI (solo funciona desde dentro del contenedor)
# Para verificar desde fuera, mira los logs:
railway logs --tail 30
```

Busca estas líneas en los logs:
```
=== Starting FastAPI on :8000 ===
FastAPI PID: xxx
=== Starting Celery worker ===
Celery PID: xxx
```

Si FastAPI arranc� bien, puedes probar la API internamente:
```bash
# Login via API
curl -s -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ruddy@laspalmas.edu","password":"TU_PASSWORD"}'
```

### Arquitectura resultante (Camino A)

```
┌──────────────────────────────────────────────────────┐
│  Railway Container (un solo servicio, 512MB)         │
│                                                      │
│  ┌────────────────┐    ┌────────────────┐           │
│  │  Streamlit     │───▶│  FastAPI       │           │
│  │  :$PORT (extern)│    │  :8000 (interno)          │
│  └────────────────┘    └────────┬───────┘           │
│                                  │                   │
│                                  ▼                   │
│                          ┌────────────┐              │
│                          │  Celery     │              │
│                          │  worker     │              │
│                          └──────┬──────┘              │
│                                 │                     │
│                                 ▼                     │
│                          ┌────────────┐              │
│                          │  Upstash   │              │
│                          │  Redis     │              │
│                          └────────────┘              │
│                                  │                   │
│                                  ▼                   │
│                          ┌────────────┐              │
│                          │ PostgreSQL │              │
│                          │ (Railway)  │              │
│                          └────────────┘              │
└──────────────────────────────────────────────────────┘
```

---

## Camino B: Multi-servicio (FastAPI público + Celery)

**Para >50 usuarios o cuando necesites API REST pública** (app móvil, integraciones).

Railway permite múltiples servicios en un proyecto, cada uno con su propio `$PORT` y dominio.

### Topología

```
┌───────────────┐       ┌──────────────┐       ┌──────────────┐
│ web (streamlit)│──────▶│  api (FastAPI)│──────▶│  postgres    │
│  $PORT (pub)  │       │  $PORT (pub)  │       └──────────────┘
└───────────────┘       └──────┬───────┘
                                │
                                ▼
                         ┌────────────┐       ┌──────────────┐
                         │ worker      │──────▶│  Upstash      │
                         │ (celery)    │       │  Redis       │
                         └─────────────┘       └──────────────┘
```

### Paso 1 — Crear servicio `api` en Railway

Railway UI → PRIAv5 project → New Service → Empty Service

1. **Service name**: `pria-api`
2. **Source**: mismo repo que `web`
3. **Root directory**: `.` (todo el repo)
4. **Start command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
5. **Variables de entorno**:
   - `JWT_SECRET` = (mismo valor que en web)
   - `DATABASE_URL` = (desde Postgres plugin)
   - `REDIS_URL` = (tu URL de Upstash)
   - `USE_CELERY` = `true`
6. **Domain**: `api.priav5.up.railway.app` (o custom `api.laspalmas.edu.bo`)

### Paso 2 — Crear servicio `worker` en Railway

Railway UI → PRIAv5 project → New Service → Empty Service

1. **Service name**: `pria-worker`
2. **Source**: mismo repo
3. **Start command**: `celery -A workers.celery_app worker --loglevel=info --concurrency=2`
4. **Variables**:
   - `JWT_SECRET` = (mismo valor)
   - `DATABASE_URL` = (desde Postgres plugin)
   - `REDIS_URL` = (Upstash)
   - `CELERY_BROKER_URL` = (Upstash)
   - `USE_CELERY` = `true`

### Paso 3 — Actualizar servicio `web`

```bash
railway variable set USE_API=true
railway variable set API_BASE_URL=https://api.priav5.up.railway.app
railway variable set USE_CELERY=false
```

`lib/api_client.py` empieza a rutear HTTP hacia `api` en vez de llamar a db/gemini directo.

### Paso 4 — Verificación

```bash
# API pública
curl https://api.priav5.up.railway.app/health        # → {"status":"ok"}
curl https://api.priav5.up.railway.app/metrics         # → Prometheus text

# Login y pedir /me
TOKEN=$(curl -s -X POST https://api.priav5.up.railway.app/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"ruddy@laspalmas.edu","password":"..."}' | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" https://api.priav5.up.railway.app/auth/me
```

---

## Redis: Por qué Upstash (y no el plugin de Railway)

Railway **no tiene plugin de Redis** en su marketplace. Las alternativas:

| Opción | Costo | Notas |
|--------|-------|-------|
| **Upstash** (recomendado) | Gratis (10K commands/day) | Redis serverless, con persistencia |
| Redis Labs | Gratis (30MB) | Similar a Upstash |
| Railway Sidecar | N/A | No soportado oficialmente |
| Self-hosted en otro server | Depende | Más operativo |

**Upstash** es la opción más simple: solo crea una cuenta, copia la URL, y funciona.

---

## Rollback

**Camino A**: Poner `USE_API=false` en Railway. Streamlit vuelve al modo standalone sin tocar nada más.

**Camino B**: En servicio `web`, poner `USE_API=false` y `API_BASE_URL=http://localhost:8000`. API y worker pueden quedarse corriendo o apagarse.

---

## Monitoreo

- `/metrics` en el servicio `api` → scrapear con Grafana Cloud (free tier)
- Sentry: `SENTRY_DSN` en todos los servicios
- Railway logs: `railway logs --service pria-api --tail`

---

## Costo (Railway, pilot-tier)

### Camino A (single-service)

| Recurso | USD/mes |
|---------|---------|
| web (streamlit, 512MB) | ~5 |
| Upstash Redis | gratis |
| postgres (ya existe) | ~5 |
| **Total extra** | **~0** |

### Camino B (multi-servicio)

| Recurso | USD/mes |
|---------|---------|
| web (streamlit, 512MB) | ~5 |
| api (fastapi, 256MB) | ~3 |
| worker (celery, 256MB) | ~3 |
| postgres (ya existe) | ~5 |
| Upstash Redis | gratis |
| **Total** | **~16/mes** |

vs. modo standalone actual: ~5 USD/mes.

Conclusión Camino A: **casi gratis**. Camino B: ~3× más, para cuando haga falta API pública o >50 usuarios.
