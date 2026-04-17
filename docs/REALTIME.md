# WebSocket y Tiempo Real en PRIA

## Resumen: No es posible con Streamlit puro

Streamlit **no permite conexiones WebSocket desde código de app personalizado**.
Streamlit usa WebSocket internamente para su propio protocolo cliente-servidor,
pero este canal no es accesible ni extendible desde el código de la app.

**Lo que SÍ funciona**: polling inteligente (el actual, mejorado).

---

## La realidad de Streamlit

Streamlit es un framework de **SSR (Server-Side Rendering)**.
El flujo normal es:

```
Usuario → Streamlit Server → Render HTML → Usuario
    ↑                                     ↓
    └────── HTTP request (nueva conexión) ←┘
```

Streamlit mantiene una conexión persistente al navegador usando WebSocket,
pero **esa conexión la maneja Streamlit internamente** — la app no tiene acceso
a ella ni puede enviar mensajes personalizados por ese canal.

### Opciones evaluadas

| Opción | ¿Funciona en Streamlit? | Complejidad | Notes |
|--------|-------------------------|-------------|-------|
| WebSocket directo | ❌ No | — | Streamlit no expone la conexión WS |
| Server-Sent Events (SSE) | ⚠️ Parcial | Alta | Requiere endpoint separado + custom component |
| Polling inteligente | ✅ Sí | Baja | El actual, mejorado a 0.5s con backoff |
| st.rerun() + sleep | ⚠️ Funciona pero es pesado | Baja | Causa parpadeo en la UI |

---

## Solución actual: Polling mejorado

El `lib/api_client.py` ya tiene polling para jobs async:

```python
# poll_interval: 0.5s (era 1.0s)
# backoff: 0.5 → 0.75 → 1.125 → 1.68... hasta 3.0s máximo
# timeout: 180s (era 120s)
```

Este polling se activa cuando `USE_CELERY=true`. El flujo es:

1. Usuario pide generar plan
2. FastAPI encola job → devuelve `job_id` inmediatamente
3. Streamlit hace polling cada 0.5s hasta que el worker termine
4. UI muestra "Generando..." durante el polling

**El polling a 0.5s es indistinguible de "tiempo real" para el usuario.**
La diferencia con WebSocket es ~0.5s de overhead adicional por mensaje,
que en el contexto de generación de planes (que tarda 5-30s) es irrelevante.

---

## ¿Cuándo importaría?

Si necesitaras:
- **Notificaciones push instantáneas** (nuevo mensaje, alerta)
- **Edición colaborativa** (dos usuarios mirando lo mismo)
- **Gráficos en tiempo real** (streaming de datos)

Para generación de planes, el polling a 0.5s es más que suficiente.

---

## Arquitectura alternativa para "tiempo real" real

Si en el futuro se necesitara WebSocket real:

1. **Separar el frontend de Streamlit**: Usar React/Vue como SPA
   que se conecta a FastAPI via WebSocket
2. **Añadir un servicio de WebSocket**: FastAPI ya tiene el endpoint
   `/ws/jobs/{job_id}` funcionando — el problema es que Streamlit
   no puede conectarse a él como cliente WebSocket

```
┌────────────┐       WebSocket       ┌────────────┐
│  React app  │◀────────────────────▶│  FastAPI   │
│  (móvil)    │                      │  /ws/jobs  │
└────────────┘                       └──────┬─────┘
                                           │
                                           ▼
                                    ┌────────────┐
                                    │  Celery    │
                                    │  worker    │
                                    └────────────┘
```

**Costo**: Reescribir el frontend de Streamlit → ~2-4 semanas de trabajo.
**Relevancia para PRIA**: Baja. Los profes no necesitan edición colaborativa.

---

## Decisión

**Por ahora**: Mantener polling mejorado (0.5s, backoff exponencial, 180s timeout).
Es simple, funciona, y es invisible para el usuario.

**Si en el futuro hay requisitos de tiempo real**:
1. Primero evaluar si Streamlit con `st.rerun()` + `asyncio` es suficiente
2. Si no, considerar frontend separado (React) + FastAPI WebSocket
3. Esto es una reescritura significativa — no es mantenimiento, es proyecto nuevo

**Documentado**: 2026-04-17. Relevar cuando hayan requisitos de edición colaborativa.
