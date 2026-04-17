# Piloto Las Palmas School — Guía de despliegue (20 usuarios)

Esta guía cubre lo mínimo necesario para poner PRIA en producción con los ~17 profes del colegio de forma segura, sin sobre-ingeniería.

## Checklist pre-lanzamiento

- [ ] Backups automáticos activos (`scripts/backup_db.py`)
- [ ] Usuarios creados en prod (`scripts/provision_users.py` con CSV real)
- [ ] Dominio personalizado configurado en Railway (opcional, ver abajo)
- [ ] Variable `GEMINI_API_KEY` en Railway secrets
- [ ] Variable `JWT_SECRET_KEY` generada con `python -c "import secrets; print(secrets.token_urlsafe(48))"` y cargada en Railway secrets
- [ ] Admin principal (Ruddy) puede entrar y crear/editar usuarios
- [ ] Al menos 1 profe "champion" probó login + flujo base

## 1. Backups

**SQLite (local dev):**
```bash
python scripts/backup_db.py --retention 30 --dest backups
```

**PostgreSQL (producción — Railway):**
```bash
railway run --service PRIAv5 python scripts/backup_pg.py
```

Genera `backups/pria_pg_YYYYMMDD_HHMMSS.sql.gz` (~114KB).
Retiene los últimos 30 días automáticamente.

**Restore:**
```bash
# Ver contenido sin restaurar
python scripts/_verify_backup_content.py

# Restaurar a otro DB (PRUEBA ESTO PRIMERO en local)
set DATABASE_URL=postgresql://...  # nueva DB de test
python scripts/restore_pg.py backups/pria_pg_YYYYMMDD_HHMMSS.sql.gz
```

**Windows Task Scheduler (semanal):**
1. Abrir `taskschd.msc`
2. Create Basic Task -> Name: `PRIA weekly backup`
3. Trigger: Weekly, Friday 20:00
4. Action: Start a program
5. Program: `C:\Users\Windows\AppData\Roaming\npm\railway.cmd`
6. Args: `run --service PRIAv5 python scripts/backup_pg.py`
7. Start in: `C:\Users\Windows\Desktop\02_Proyectos\PRIA\PRIA DEPLOY`

Backup verificado: 17 usuarios, 586 sesiones, 2366 micro_objetivos, 710 filas de horario. ✅

## 2. Provisioning de usuarios

Editá `docs/teachers_template.csv` con los 17 profes y admins:

```csv
email,nombre,nombre_hoja,password,rol
ruddy@laspalmas.edu,Ruddy Ribera,RUDDY,Piloto2026!,admin
yamile@laspalmas.edu,Yamile Perez,YAMILE,Piloto2026!,docente
```

- `nombre_hoja` debe coincidir EXACTAMENTE con el nombre de la hoja en el xlsx (ej: `ANGELICA` sin tilde si así viene).
- Passwords iniciales genéricos → obligar cambio en primer login (política pendiente de implementar).

Ejecutar:

```bash
# Dry-run primero
python scripts/provision_users.py --csv docs/teachers_2026.csv --dry-run

# Real
python scripts/provision_users.py --csv docs/teachers_2026.csv
```

Idempotente: si el email ya existe, lo salta.

## 3. Secrets en Railway

Mínimos requeridos:

| Variable | Dónde se usa | Cómo generar |
|---|---|---|
| `GEMINI_API_KEY` | ui/gemini.py | Google AI Studio |
| `JWT_SECRET_KEY` | api/config.py | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `SENTRY_DSN` (opcional) | db/_base.py | sentry.io |
| `REDIS_URL` (opcional) | ui/cache_redis.py | Railway Redis plugin |
| `DATABASE_URL` (opcional) | db/_base.py | Railway Postgres plugin |

## 4. Dominio personalizado

En Railway → Settings → Networking → Custom Domain. Apuntar CNAME a `priav5-production.up.railway.app`. Sugerido: `pria.laspalmas.edu.bo` o similar.

## 5. Soft launch

Semana 1 (1-2 champions): Ruddy + 1 profe amigo. Usar, reportar bugs.
Semana 2 (5 profes): ampliar a un grupo piloto de primaria.
Semana 3 (todo el colegio): go live.

## 6. Qué monitorear

- `/health` responde 200 (ya hay health check en CI)
- Sentry (si está activo) sin errores críticos
- Logs de Railway: `railway logs --tail`

## 7. Rollback

```bash
git revert <sha-malo>
git push  # Railway auto-deploya el revert
```

Si el DB quedó corrupto: restaurar el último backup manualmente.
