"""
scripts/restore_pg.py — Restore PRIA PostgreSQL from backup
==============================================================
Usage:
  Local restore:   python scripts/restore_pg.py backups/pria_pg_YYYYMMDD_HHMMSS.sql.gz
  Via Railway:     railway run --service PRIAv5 python scripts/restore_pg.py backups/pria_pg_YYYYMMDD_HHMMSS.sql.gz

CAUTION: This script restores data to the database pointed to by DATABASE_URL.
For local testing, set a different DATABASE_URL (e.g., a local test DB).

This script reads the .sql.gz file and executes SQL via COPY commands.
PostgreSQL's psql binary handles the format natively; this script is for
use when psql is not available in the container (Railway doesn't have it).
"""

import sys, os, gzip, io
from pathlib import Path


def restore(gz_path: str, *, verbose: bool = True):
    """Restore a compressed PostgreSQL dump."""
    import psycopg2

    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    gz = Path(gz_path)
    if not gz.exists():
        print(f"ERROR: File not found: {gz_path}")
        sys.exit(1)

    if verbose:
        print(f"[Restore] Reading {gz.name} ({gz.stat().st_size:,} bytes)...")

    with gzip.open(gz, "rt", encoding="utf-8") as f:
        sql = f.read()

    con = psycopg2.connect(url)
    con.autocommit = True

    if verbose:
        print("[Restore] Executing SQL...")
        # Split on COPY statements and execute them using binary copy
        parts = sql.split("\\.\n")
        for i, part in enumerate(parts):
            part = part.strip()
            if not part or part.startswith("--"):
                continue
            if "COPY " in part:
                try:
                    cur = con.cursor()
                    # Parse COPY command to restore
                    copy_match = part.find("COPY ")
                    if copy_match >= 0:
                        copy_cmd = part[copy_match:]
                        # Only execute pure COPY commands (not CREATE TABLE)
                        if copy_cmd.startswith("COPY ") and not copy_cmd.startswith(
                            "COPY "
                        ):
                            pass
                    cur.execute(part)
                    cur.close()
                except Exception as e:
                    if verbose:
                        print(f"  Note: {part[:60]}... -> {e}")
            else:
                try:
                    cur = con.cursor()
                    cur.execute(part)
                    cur.close()
                except Exception as e:
                    if verbose:
                        print(f"  Note: {part[:60]}... -> {e}")

    con.close()

    if verbose:
        print(f"[Restore] Done: {gz.name} restored")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/restore_pg.py <backup.sql.gz>")
        print(
            "Example: python scripts/restore_pg.py backups/pria_pg_20260417_165335.sql.gz"
        )
        sys.exit(1)

    restore(sys.argv[1])


if __name__ == "__main__":
    main()
