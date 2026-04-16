"""Session state Pydantic model for PRIA."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class SessionData(BaseModel):
    """Pydantic model representing PRIA session state.

    All fields match SESSION_DEFAULTS in ui/helpers.py.
    Use Field(default=...) for None-able fields and Field(default_factory=...) for lists.
    """

    session_id: Optional[str] = Field(default=None)
    autenticado: bool = Field(default=False)
    grado_nivel: str = Field(default="5to primaria")
    key_index: int = Field(default=0)
    last_error: Optional[str] = Field(default=None)
    last_generar_fn: Optional[str] = Field(default=None)
    last_generar_vars: Optional[dict] = Field(default=None)
    last_generar_json: bool = Field(default=False)

    # Uploaded Textbook (TB)
    uploaded_tb_bytes: Optional[bytes] = Field(default=None)
    uploaded_tb_name: Optional[str] = Field(default=None)
    uploaded_tb_hash: Optional[str] = Field(default=None)
    tb_extracted: Optional[Any] = Field(default=None)

    # Uploaded Student Book (SB)
    uploaded_sb_bytes: Optional[bytes] = Field(default=None)
    uploaded_sb_name: Optional[str] = Field(default=None)
    uploaded_sb_hash: Optional[str] = Field(default=None)
    sb_extracted: Optional[Any] = Field(default=None)

    # Diagnostics
    uploaded_diag_files: list = Field(default_factory=list)
    diagnosticos_texto: Optional[str] = Field(default=None)
    diagnosticos_tabla: list = Field(default_factory=list)

    # Results M0 (Unidad/ABP)
    res_m0a: Optional[str] = Field(default=None)
    res_m0b: Optional[str] = Field(default=None)
    res_m0c: Optional[str] = Field(default=None)

    # Topic state
    tema_activo: str = Field(default="")
    tema_hash: str = Field(default="")
    leccion_index: int = Field(default=0)
    conceptos_activos: list = Field(default_factory=list)
    palabras_clave_activas: list = Field(default_factory=list)
    contenido_tema_activo: str = Field(default="")

    # Results M1 (Plan Clase / Diapositivas / Ficha)
    res_m1a: Optional[str] = Field(default=None)
    res_m1a_prev: Optional[str] = Field(default=None)
    res_m1b: Optional[str] = Field(default=None)
    res_m1c: Optional[str] = Field(default=None)

    # Results M2 (Quiz / Tutor)
    res_m2a: Optional[str] = Field(default=None)
    res_m2b: Optional[str] = Field(default=None)

    # UI state
    mostrar_adaptaciones_prev: bool = Field(default=False)
    _pptx_cache: Optional[Any] = Field(default=None)

    # User info
    teacher_name: str = Field(default="")
    school_name: str = Field(default="")
