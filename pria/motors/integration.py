"""Motors integration - backward compatibility."""

from pathlib import Path

PROMPTS_DIR = Path("prompts_maestros")


def load_motor_prompt(motor_name: str) -> str:
    """Load motor prompt from file (file-based fallback)."""
    ruta = PROMPTS_DIR / f"{motor_name}.txt"
    if ruta.exists():
        with open(ruta, "r", encoding="utf-8") as f:
            return f.read()
    return None


def get_motor_stats() -> dict:
    """Get motor usage statistics (stub)."""
    return {
        "total_motors": 0,
        "total_uses": 0,
        "success_rate": 0.0,
        "avg_duration": 0.0,
        "motors": [],
    }


def render_motor_dashboard():
    """Render motor analytics dashboard (stub)."""
    import streamlit as st

    st.info("Motor analytics no disponible en este entorno.")
