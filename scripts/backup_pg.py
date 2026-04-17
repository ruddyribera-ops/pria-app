"""
scripts/backup_pg.py — PostgreSQL backup script for PRIA prod
=============================================================
Creates a compressed SQL dump of the prod database using Python + psycopg2.
Idempotent: safe to run multiple times.
Retains backups for 30 days.

Usage:
  With Railway CLI:  railway run --service PRIAv5 python scripts/backup_pg.py
  With DATABASE_URL: set DATABASE_URL then python scripts/backup_pg.py
  Cron (Windows):    Task Scheduler -> weekly Friday 20:00
"""

import os, sys, gzip, io
from datetime import datetime, timedelta, date
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
DEST = Path("backups")
RETENTION_DAYS = 30

url = os.environ.get("DATABASE_URL", "")
if not url:
    print("ERROR: DATABASE_URL no esta definida.")
    print("  railway run --service PRIAv5 python scripts/backup_pg.py")
    sys.exit(1)

DEST.mkdir(exist_ok=True)

ts = datetime.now().strftime("%Y%m%d_%H%M%S")
gz_file = DEST / f"pria_pg_{ts}.sql.gz"

# ── Connect to PostgreSQL ────────────────────────────────────────────────────
import psycopg2, psycopg2.extras

con = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
con.autocommit = True

print("[1/3] Dumping schema and data...")

buf = io.StringIO()

# ── Dump table by table ─────────────────────────────────────────────────────
tables = [
    "usuarios",
    "auth_tokens",
    "horario_docente",
    "calendario_escolar",
    "actividades_cronograma",
    "comisiones_docente",
    "vigilancias_recreo",
    "vigilancia_asignacion",
    "bloques_diario_log",
    "sesiones",
    "micro_objetivos",
    "planes_buffer",
]

with con.cursor() as cur:
    for table in tables:
        # Dump table schema
        cur.execute(
            f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position",
            (table,),
        )
        cols = cur.fetchall()

        if not cols:
            # Table might not exist, skip
            continue

        col_names = [c["column_name"] for c in cols]
        col_defs = [c["data_type"] for c in cols]

        # CREATE TABLE
        buf.write(f"\n-- Table: {table}\n")
        buf.write(f"CREATE TABLE IF NOT EXISTS {table} (\n")
        col_def_list = [f"  {cn} {cd}" for cn, cd in zip(col_names, col_defs)]
        buf.write(",\n".join(col_def_list))
        buf.write("\n);\n")

        # COPY data
        buf.write(
            f"COPY {table} ({', '.join(col_names)}) FROM STDIN WITH CSV NULL '';\n"
        )

        cur.execute(f"SELECT * FROM {table}")
        for row in cur:
            values = []
            for v in row.values():
                if v is None:
                    values.append("")
                elif isinstance(v, (datetime, date)):
                    values.append(v.isoformat())
                elif isinstance(v, bool):
                    values.append("t" if v else "f")
                else:
                    s = str(v)
                    s = (
                        s.replace("\\", "\\\\")
                        .replace("\r", "\\r")
                        .replace("\n", "\\n")
                        .replace("\t", "\\t")
                    )
                    values.append(s)
            buf.write("\t".join(values) + "\n")
        buf.write("\\.\n")

con.close()

# ── Compress and save ─────────────────────────────────────────────────────────
print(f"[2/3] Compressing -> {gz_file}")
sql_bytes = buf.getvalue().encode("utf-8")
with gzip.open(gz_file, "wb") as f:
    f.write(sql_bytes)

# ── Prune old backups ─────────────────────────────────────────────────────────
print(f"[3/3] Pruning backups older than {RETENTION_DAYS} days")
cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
pruned = 0
for f in sorted(DEST.glob("pria_pg_*.sql.gz")):
    mtime = datetime.fromtimestamp(f.stat().st_mtime)
    if mtime < cutoff:
        print(f"  - deleted: {f.name}")
        f.unlink()
        pruned += 1

print(f"OK: backup at {gz_file} ({gz_file.stat().st_size:,} bytes)")
print(f"    total backups retained: {len(list(DEST.glob('pria_pg_*.sql.gz')))}")
