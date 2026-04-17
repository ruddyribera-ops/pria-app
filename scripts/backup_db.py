"""
scripts/backup_db.py — Timestamped SQLite backup with retention
===============================================================
Creates a dated copy of pria_estado.db in backups/ and deletes backups
older than RETENTION_DAYS.

Usage:
    python scripts/backup_db.py [--retention 30] [--dest backups]

Schedule (Windows Task Scheduler): daily at 02:00.
On Railway: cron service or in the worker process.

Idempotent. Safe to run while the app is live — SQLite backup API is
used (not a file copy), so readers/writers keep working.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

DEFAULT_RETENTION_DAYS = 30
DEFAULT_DEST = "backups"


def _find_db_path() -> Path:
    """Return the absolute path of pria_estado.db at the project root."""
    here = Path(__file__).resolve().parent
    candidate = here.parent / "pria_estado.db"
    if not candidate.exists():
        raise FileNotFoundError(f"DB not found at {candidate}")
    return candidate


def backup(db_path: Path, dest_dir: Path) -> Path:
    """Use sqlite3 online backup API (safe during writes)."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = dest_dir / f"pria_estado_{stamp}.db"

    src = sqlite3.connect(str(db_path))
    try:
        dst = sqlite3.connect(str(out))
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()

    return out


def prune(dest_dir: Path, retention_days: int) -> list[Path]:
    """Delete *.db backups older than retention_days. Returns deleted paths."""
    cutoff = datetime.now() - timedelta(days=retention_days)
    deleted: list[Path] = []
    if not dest_dir.exists():
        return deleted
    for p in dest_dir.glob("pria_estado_*.db"):
        try:
            mtime = datetime.fromtimestamp(p.stat().st_mtime)
            if mtime < cutoff:
                p.unlink()
                deleted.append(p)
        except OSError:
            continue
    return deleted


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--retention",
        type=int,
        default=int(os.environ.get("BACKUP_RETENTION_DAYS", DEFAULT_RETENTION_DAYS)),
    )
    parser.add_argument(
        "--dest",
        default=os.environ.get("BACKUP_DEST_DIR", DEFAULT_DEST),
    )
    args = parser.parse_args()

    try:
        db = _find_db_path()
    except FileNotFoundError as e:
        print(f"[backup] ERROR: {e}", file=sys.stderr)
        return 1

    here = Path(__file__).resolve().parent
    dest_dir = (here.parent / args.dest).resolve()

    out = backup(db, dest_dir)
    size_kb = out.stat().st_size / 1024
    print(f"[backup] wrote {out.name} ({size_kb:.1f} KB)")

    deleted = prune(dest_dir, args.retention)
    if deleted:
        print(f"[backup] pruned {len(deleted)} backup(s) older than {args.retention}d")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
