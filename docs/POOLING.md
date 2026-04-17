# pgBouncer y Pooling de PostgreSQL en Railway

## Resumen: No hace falta por ahora

Con 17 usuarios (o 100) en Railway, PostgreSQL maneja las conexiones sin pgBouncer.
Esta decisión se revisará cuando se detecten problemas reales de conexión.

---

## ¿Qué es pgBouncer?

pgBouncer es un pooler de conexiones de PostgreSQL que permite compartir
conexiones entre muchos clientes. Varios clientes se conectan a pgBouncer,
y pgBouncer mantiene un pool de conexiones reales a PostgreSQL.

**Ventaja**: Reduce el overhead de abrir/cerrar conexiones para cada request.

**Problema**: Añade latencia (un salto más), complicidad operativa, y puede romper
transacciones si se configura mal (session pooling vs transaction pooling).

---

## ¿Por qué NO hace falta en PRIA hoy?

### Números reales

| Escenario | Usuarios | Conexiones necesarias |
|-----------|---------|----------------------|
| Hoy | 17 | 17 (1 por usuario activo) |
| Meta | 100 | 100 (peak concurrente ~20-30) |

PostgreSQL aguanta **200 conexiones simultáneas** sin problemas en Railway.
El límite de Railway en tier hobby es ~20 conexiones, pero en producción
Railway usa un proxy de PostgreSQL que ya tiene pooling interno.

### Arquitectura actual de PRIA

En `db/_base.py`:
```python
if DATABASE_URL:
    # Modo PostgreSQL — Railway proxy ya tiene pooling
    conn = psycopg2.connect(DATABASE_URL, ...)
else:
    # Modo SQLite local
    conn = sqlite3.connect(db_path, ...)
```

Railway ya expone `DATABASE_URL` que apunta a un proxy de PostgreSQL.
Ese proxy maneja pooling internamente.

---

## ¿Cuándo SÍ haría falta pgBouncer?

| Señal | Umbral |
|-------|--------|
| `too many connections` error | >20 conexiones activas |
| Latencia >500ms por query | Conexiones nuevas frecuentes |
| Muchas funciones lambda/similar | Miles de conexiones/hora |

### Solución antes de pgBouncer

1. **Checkear el pool de Railway**: `SHOW stats_numbackends FROM pg_stat_database;`
2. **Reducir `max_connections` en la app**: revisar si hay conexiones que no se cierran
3. **Upgrade Railway PostgreSQL tier**: más conexiones disponibles (~100)

---

## ¿Cómo se implementaría pgBouncer en Railway?

Si en el futuro se necesita (miles de usuarios, no cientos), la arquitectura sería:

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  PRIA app     │────▶│  pgBouncer  │────▶│  PostgreSQL  │
│  (Streamlit)   │     │  :5433      │     │  :5432       │
└──────────────┘     └─────────────┘     └──────────────┘
```

En Railway esto requiere:
1. Un servicio adicional (contenedor con pgBouncer)
2. `DATABASE_URL` actualizada para apuntar a pgBouncer en vez de PostgreSQL directo
3. Configuración de pooling (`pool_mode = transaction`, `max_client_conn = 200`)

**Costo extra**: ~$3-5/mes por el servicio adicional de pgBouncer.

---

## Decisión

**Por ahora**: No implementar. PostgreSQL de Railway maneja la carga.

**Revisar**: Cada 6 meses o cuando hayan problemas reales de conexión.

**Documentado**: 2026-04-17 por OpenCode/Claude Code en sesión de escalabilidad.
