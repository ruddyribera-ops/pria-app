"""
tests/test_scripts.py — Pilot ops scripts
=========================================
Covers scripts/backup_db.py and scripts/provision_users.py.
"""

from __future__ import annotations

import csv
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# backup_db
# ─────────────────────────────────────────────────────────────────────────────


def _write_dummy_db(path: Path) -> None:
    conn = sqlite3.connect(str(path))
    conn.execute("CREATE TABLE t (id INTEGER, v TEXT)")
    conn.execute("INSERT INTO t VALUES (1, 'hello')")
    conn.commit()
    conn.close()


def test_backup_creates_file_and_prunes(tmp_path, monkeypatch):
    scripts_dir = Path(__file__).resolve().parent.parent / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import backup_db  # type: ignore
    finally:
        sys.path.pop(0)

    src = tmp_path / "pria_estado.db"
    _write_dummy_db(src)

    dest = tmp_path / "backups"

    # Force _find_db_path to point at our temp DB
    monkeypatch.setattr(backup_db, "_find_db_path", lambda: src)

    out = backup_db.backup(src, dest)
    assert out.exists() and out.stat().st_size > 0
    assert out.name.startswith("pria_estado_")

    # Verify the backup contains the row
    conn = sqlite3.connect(str(out))
    got = conn.execute("SELECT v FROM t WHERE id=1").fetchone()[0]
    conn.close()
    assert got == "hello"


def test_backup_prune_deletes_old(tmp_path):
    scripts_dir = Path(__file__).resolve().parent.parent / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import backup_db  # type: ignore
    finally:
        sys.path.pop(0)

    dest = tmp_path / "backups"
    dest.mkdir()

    old = dest / "pria_estado_20200101_000000.db"
    old.write_bytes(b"old")
    # Set mtime to 60 days ago
    old_time = (datetime.now() - timedelta(days=60)).timestamp()
    import os as _os

    _os.utime(old, (old_time, old_time))

    new = dest / "pria_estado_99990101_000000.db"
    new.write_bytes(b"new")

    deleted = backup_db.prune(dest, retention_days=30)
    assert old in deleted
    assert new.exists()


# ─────────────────────────────────────────────────────────────────────────────
# provision_users
# ─────────────────────────────────────────────────────────────────────────────


def test_provision_creates_users_and_skips_duplicates(db, tmp_path):
    """
    Uses the shared `db` fixture (isolated SQLite). Requires that the
    script imports db module AFTER monkeypatching — script does
    init_db() on its own, which is safe because db._base has already
    been patched by the fixture.
    """
    scripts_dir = Path(__file__).resolve().parent.parent / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import importlib
        import provision_users  # type: ignore

        importlib.reload(provision_users)
    finally:
        sys.path.pop(0)

    csv_path = tmp_path / "teachers.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["email", "nombre", "nombre_hoja", "password", "rol"])
        writer.writerow(["a@t.com", "Alpha", "ALPHA", "pw12345678", "docente"])
        writer.writerow(["b@t.com", "Beta", "BETA", "pw12345678", "admin"])

    # First run: both created
    result = provision_users.provision(csv_path)
    assert result["created"] == 2
    assert result["skipped"] == 0
    assert result["failed"] == []

    # Second run: both skipped
    result2 = provision_users.provision(csv_path)
    assert result2["created"] == 0
    assert result2["skipped"] == 2


def test_provision_dry_run_does_not_write(db, tmp_path):
    scripts_dir = Path(__file__).resolve().parent.parent / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import importlib
        import provision_users  # type: ignore

        importlib.reload(provision_users)
    finally:
        sys.path.pop(0)

    csv_path = tmp_path / "teachers.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["email", "nombre", "nombre_hoja", "password", "rol"])
        writer.writerow(["c@t.com", "Gamma", "GAMMA", "pw12345678", "docente"])

    result = provision_users.provision(csv_path, dry_run=True)
    assert result["created"] == 0

    # Verify nothing was persisted
    from db import get_usuario_by_email

    assert get_usuario_by_email("c@t.com") is None


def test_provision_rejects_missing_columns(db, tmp_path):
    scripts_dir = Path(__file__).resolve().parent.parent / "scripts"
    sys.path.insert(0, str(scripts_dir))
    try:
        import importlib
        import provision_users  # type: ignore

        importlib.reload(provision_users)
    finally:
        sys.path.pop(0)

    bad = tmp_path / "bad.csv"
    bad.write_text("email,nombre\nx@t.com,X\n", encoding="utf-8")
    with pytest.raises(ValueError):
        provision_users.provision(bad)
