"""Seeds the database with default users. Uses db_pria so it works with both SQLite and PostgreSQL."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_pria import crear_usuario, verificar_login, init_db, _USE_PG

print(f"Backend: {'PostgreSQL' if _USE_PG else 'SQLite'}")

init_db()

SEED_USERS = [
    # (email/username, password, nombre, nombre_hoja, rol)
    ("admin",                        "2b0n2b!123", "Administrador", "ADMIN", "admin"),
    ("misterruddy@laspalmas.edu.bo", "2b0n2b!123", "Ruddy Ribera",  "RUDDY", "docente"),
]

for email, password, nombre, hoja, rol in SEED_USERS:
    ok = crear_usuario(email, password, nombre, hoja, rol)
    print(f"{'Created' if ok else 'Already exists'}: {email} [{rol}]")

print("Seed complete.")
