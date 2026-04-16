"""
Migration 001: Add salt column to usuarios table

Usage:
    python migrations/001_add_salt_column.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import _conn, _USE_PG, _DB_PATH


def column_exists(table, col):
    with _conn() as con:
        if _USE_PG:
            result = con.execute(
                f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}'"
            ).fetchone()
            return result is not None
        else:
            result = con.execute(f"PRAGMA table_info({table})").fetchall()
            return any(row[1] == col for row in (result or []))


def migrate():
    print(f"Database: {'PostgreSQL' if _USE_PG else 'SQLite'}")
    print(f"Path: {_DB_PATH}")
    print("-" * 40)

    if column_exists("usuarios", "salt"):
        print("[OK] Salt column already exists")
        return True

    print("Adding salt column...")

    try:
        with _conn() as con:
            con.execute("ALTER TABLE usuarios ADD COLUMN salt TEXT DEFAULT ''")
        print("[OK] Salt column added!")
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        print("\nRun manually:")
        print("  ALTER TABLE usuarios ADD COLUMN salt TEXT DEFAULT '';")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("PRIA Migration 001: Add salt column")
    print("=" * 50)

    success = migrate()
    print("-" * 50)
    sys.exit(0 if success else 1)
