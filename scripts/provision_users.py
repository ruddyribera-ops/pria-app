"""
scripts/provision_users.py — Bulk user provisioning from CSV
============================================================
Creates users in the PRIA database from a CSV file. Skips rows whose
email already exists. Prints a summary at the end.

CSV columns (header required):
    email,nombre,nombre_hoja,password,rol

- `rol` is optional (defaults to "docente"). Use "admin" for admins.
- `password` is the initial password. Users must change it on first login
  (implement rotation policy separately if needed).

Usage:
    python scripts/provision_users.py --csv docs/teachers_2026.csv
    python scripts/provision_users.py --csv teachers.csv --dry-run

CSV example:
    email,nombre,nombre_hoja,password,rol
    ruddy@laspalmas.edu,Ruddy Ribera,RUDDY,Pilot2026!,admin
    yamile@laspalmas.edu,Yamile Perez,YAMILE,Pilot2026!,docente
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path


def _ensure_project_on_path() -> None:
    here = Path(__file__).resolve().parent
    root = here.parent
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))


def provision(csv_path: Path, dry_run: bool = False) -> dict:
    _ensure_project_on_path()
    from db import crear_usuario, get_usuario_by_email, init_db

    init_db()

    created = 0
    skipped = 0
    failed: list[str] = []

    with csv_path.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        required = {"email", "nombre", "nombre_hoja", "password"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing columns: {sorted(missing)}")

        for row in reader:
            email = (row.get("email") or "").strip().lower()
            if not email:
                continue

            if get_usuario_by_email(email):
                skipped += 1
                print(f"  - skip   {email} (already exists)")
                continue

            if dry_run:
                print(f"  + would  {email} ({row.get('rol') or 'docente'})")
                continue

            ok = crear_usuario(
                email=email,
                password=row["password"],
                nombre=row["nombre"].strip(),
                nombre_hoja=row["nombre_hoja"].strip().upper(),
                rol=(row.get("rol") or "docente").strip().lower(),
            )
            if ok:
                created += 1
                print(f"  + create {email}")
            else:
                failed.append(email)
                print(f"  ! fail   {email}")

    return {"created": created, "skipped": skipped, "failed": failed}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"[provision] ERROR: csv not found: {args.csv}", file=sys.stderr)
        return 1

    result = provision(args.csv, dry_run=args.dry_run)
    print()
    print(f"[provision] created={result['created']} skipped={result['skipped']} failed={len(result['failed'])}")
    if result["failed"]:
        print(f"[provision] failed emails: {result['failed']}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
