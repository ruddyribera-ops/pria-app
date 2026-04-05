"""Seeds the database with the default admin user if it doesn't exist."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_pria import crear_usuario, verificar_login

email    = "misterruddy@laspalmas.edu.bo"
password = "2b0n2b!123"
nombre   = "Ruddy Ribera"
hoja     = "ADMIN"
rol      = "admin"

if verificar_login(email, password):
    print(f"User {email} already exists — skipping.")
else:
    ok = crear_usuario(email, password, nombre, hoja, rol)
    print(f"Created admin user {email}: {'OK' if ok else 'FAILED (already exists?)'}")
