"""
scripts/notify_users.py — Notificar a usuarios sus credenciales temporales
==========================================================================
Genera cartas de notificación para nuevos usuarios del piloto PRIA.

Uso (local con Railway):
    railway run --service PRIAv5 python scripts/notify_users.py --dry-run
    railway run --service PRIAv5 python scripts/notify_users.py --enviar

Uso (directo con DATABASE_URL en entorno):
    set DATABASE_URL=postgresql://...
    python scripts/notify_users.py --dry-run

Requiere variables de entorno para enviar emails:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
"""

import os, sys, argparse
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))

TEMPLATE = """\
Colegio Las Palmas — Sistema PRIA
=================================

Estimado/a {nombre},

Te informamos que se ha creado tu cuenta en el sistema PRIA
(Planificacion Neuro-Inclusiva Asistida), la herramienta de
planificacion docente que usamos este ano en Las Palmas.

=== TUS DATOS DE ACCESO ===

  Sistema:   https://priav5-production.up.railway.app
  Email:     {email}
  Password:  {password}

=== PASOS PARA COMENZAR ===

1. Abre el sistema en tu navegador
2. Haz clic en "Iniciar Sesion"
3. Ingresa tu email y password
4. IMPORTANTE: El sistema te pedira cambiar tu password
   la primera vez que ingreses. Usa una contrasena que
   recuerdes bien (minimo 10 caracteres).

=== QUE ES PRIA? ===

PRIA es tu asistente de planificacion. Con el puedes:
- Planificar clases diarias, semanales y trimestrales
- Generar planes con ayuda de inteligencia artificial (Gemini)
- Exportar tus planeaciones a Word y PowerPoint
- Gestionar tus sesiones y objetivos de aprendizaje

=== SOPORTE ===

Si tienes problemas para acceder o dudas sobre el uso,
contacta a Ruddy Ribera: ruddy@laspalmas.edu.bo

!Bienvenido/a al sistema!

Atentamente,
Equipo PRIA - Las Palmas School
Fecha: {fecha}
"""


def get_usuarios_notificar() -> list[dict]:
    """Carga usuarios a notificar desde la DB (prod o local segun DATABASE_URL)."""
    from db import get_all_usuarios

    usuarios = get_all_usuarios()
    notify_emails = {
        "missadela@laspalmas.edu.bo",
        "misssusi@laspalmas.edu.bo",
        "missgalia@laspalmas.edu.bo",
    }
    return [u for u in usuarios if u.get("email", "").lower() in notify_emails]


def generar_notificacion(usuario: dict, password: str) -> str:
    """Genera el texto de notificacion para un usuario."""
    return TEMPLATE.format(
        nombre=usuario.get("nombre", usuario.get("nombre_hoja", "Docente")),
        email=usuario.get("email", ""),
        password=password,
        fecha=date.today().strftime("%d de %B de %Y"),
    )


def enviar_email(texto: str, destinatario: str, smtp_config: dict) -> bool:
    """Envía email via SMTP. Retorna True si exito, False si falla."""
    import smtplib
    from email.message import EmailMessage

    try:
        msg = EmailMessage()
        msg["Subject"] = "Tu cuenta PRIA - Colegio Las Palmas"
        msg["From"] = smtp_config["from"]
        msg["To"] = destinatario
        msg.set_content(texto)
        with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
            server.starttls()
            server.login(smtp_config["user"], smtp_config["pass"])
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"  ERROR enviando a {destinatario}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Notificar usuarios PRIA")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview los mensajes sin enviar",
    )
    parser.add_argument(
        "--enviar",
        action="store_true",
        help="Enviar emails por SMTP (requiere SMTP_* vars)",
    )
    args = parser.parse_args()

    print("=== Notificacion de cuentas PRIA - Colegio Las Palmas ===\n")

    usuarios = get_usuarios_notificar()

    if not usuarios:
        print(
            "No hay usuarios pendientes de notificar.\n"
            "Solo se notifican: missadela, misssusi, missgalia\n"
            "Verifica que esten creados en la DB."
        )
        return

    smtp_config = {
        "host": os.environ.get("SMTP_HOST", ""),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "pass": os.environ.get("SMTP_PASS", ""),
        "from": os.environ.get("SMTP_FROM", "noreply@laspalmas.edu.bo"),
    }
    tiene_smtp = bool(smtp_config["host"] and smtp_config["user"])

    if args.enviar and not tiene_smtp:
        print(
            "ERROR: SMTP no configurado.\n"
            "  Define: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM\n"
            "  O usa --dry-run para solo previsualizar.\n"
        )
        return

    PASSWORD_TEMPORAL = "CAMBIAR_Piloto2026!"

    for usuario in usuarios:
        email = usuario.get("email", "")
        texto = generar_notificacion(usuario, PASSWORD_TEMPORAL)

        print(f"--- Email para: {email} ---")
        print(texto)
        print()

        if args.enviar and tiene_smtp:
            if enviar_email(texto, email, smtp_config):
                print(f"  OK enviado a {email}")
            else:
                print(f"  FALLO envio a {email}")

    print(f"\nTotal: {len(usuarios)} usuario(s) procesados.")

    if not args.enviar:
        print(
            "\nPara enviar: railway run --service PRIAv5 python scripts/notify_users.py --enviar"
        )
        print("Para previsualizar: python scripts/notify_users.py --dry-run")


if __name__ == "__main__":
    main()
