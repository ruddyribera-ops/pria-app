"""Seeds the database with default users if they don't exist."""
import sys, os, hashlib, sqlite3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pria_estado.db")

def _hash(p):
    return hashlib.sha256(p.encode()).hexdigest()

SEED_USERS = [
    # (email/username, password, nombre, nombre_hoja, rol)
    ("admin",                        "2b0n2b!123", "Administrador",  "ADMIN",  "admin"),
    ("misterruddy@laspalmas.edu.bo", "2b0n2b!123", "Ruddy Ribera",   "RUDDY",  "docente"),
]

print(f"DB path: {DB_PATH}")

con = sqlite3.connect(DB_PATH)
con.row_factory = sqlite3.Row

con.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nombre        TEXT NOT NULL,
        nombre_hoja   TEXT NOT NULL,
        rol           TEXT DEFAULT 'docente',
        activo        INTEGER DEFAULT 1,
        creado_en     TEXT DEFAULT (datetime('now','localtime'))
    )
""")
con.commit()

for email, password, nombre, hoja, rol in SEED_USERS:
    row = con.execute("SELECT id FROM usuarios WHERE email=?", (email,)).fetchone()
    if row:
        con.execute(
            "UPDATE usuarios SET activo=1, rol=?, password_hash=? WHERE email=?",
            (rol, _hash(password), email)
        )
        print(f"Updated: {email}")
    else:
        con.execute(
            "INSERT INTO usuarios (email, password_hash, nombre, nombre_hoja, rol, activo) VALUES (?,?,?,?,?,1)",
            (email, _hash(password), nombre, hoja, rol)
        )
        print(f"Created: {email} [{rol}]")

con.commit()
con.close()
print("Seed complete.")
