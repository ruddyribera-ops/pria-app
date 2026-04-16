"""
db/utils.py — Miscellaneous time and alert utilities
====================================================
"""

from datetime import datetime


def minutos_para_fin_clase(hora_fin_str: str) -> int | None:
    try:
        parte = hora_fin_str.strip().split("-")[-1].strip()
        ahora = datetime.now()
        fin = datetime.strptime(parte, "%H:%M").replace(
            year=ahora.year, month=ahora.month, day=ahora.day
        )
        return int((fin - ahora).total_seconds() / 60)
    except Exception:
        return None
