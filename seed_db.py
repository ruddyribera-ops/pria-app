"""Seeds the database with the default admin user if it doesn't exist."""
import sys, os, hashlib, sqlite3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pria_estado.db")

email    = "misterruddy@laspalmas.edu.bo"
password = "2b0n2b!123"
nombre   = "Ruddy Ribera"
hoja     = "ADMIN"
rol      = "admin"

def _hash(p):
    return hashlib.sha256(p.encode()).hexdigest()

print(f"DB path: {DB_PATH}")
print(f"DB exists: {os.path.exists(DB_PATH)}")

con = sqlite3.connect(DB_PATH)
con.row_factory = sqlite3.Row

# Ensure table exists
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

row = con.execute("SELECT * FROM usuarios WHERE email=?", (email,)).fetchone()
if row:
    print(f"User exists: activo={row['activo']} rol={row['rol']}")
    # Make sure it's active and admin
    con.execute("UPDATE usuarios SET activo=1, rol='admin', password_hash=? WHERE email=?", (_hash(password), email))
    con.commit()
    print("Updated password/role/activo.")
else:
    con.execute(
        "INSERT INTO usuarios (email, password_hash, nombre, nombre_hoja, rol, activo) VALUES (?,?,?,?,?,1)",
        (email, _hash(password), nombre, hoja, rol)
    )
    con.commit()
    print(f"Created admin user {email} OK")

con.close()
