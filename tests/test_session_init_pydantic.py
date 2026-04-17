"""
Regression tests for init_session_state() — guards against the
PydanticUndefined poisoning bug that broke prod login flow.

Context: Fields declared as `Field(default_factory=list)` have
`field_info.default == PydanticUndefined` (a sentinel, NOT None).
The previous init code branched on `if default is not None:` and
assigned the sentinel to st.session_state, causing downstream
`TypeError: 'PydanticUndefinedType' object is not iterable`.

Fix: use FieldInfo.get_default(call_default_factory=True).
"""

from unittest.mock import MagicMock, patch

import pytest
from pydantic_core import PydanticUndefined

from pria_docs.session_schema import SessionData


class _FakeSessionState(dict):
    """Dict with attribute access — mimics Streamlit's SessionStateProxy."""

    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError as e:
            raise AttributeError(key) from e

    def __setattr__(self, key, value):
        self[key] = value


@pytest.fixture
def fake_ss(monkeypatch):
    ss = _FakeSessionState()
    # ui.helpers uses `import streamlit as st` and references st.session_state.
    # Patch BOTH the module-level reference and streamlit.session_state itself
    # so that `st.session_state[...]` inside init_session_state hits our fake.
    import streamlit as st

    monkeypatch.setattr(st, "session_state", ss, raising=False)
    from ui import helpers as _helpers

    monkeypatch.setattr(_helpers.st, "session_state", ss, raising=False)
    return ss


def test_list_fields_initialize_as_empty_lists(fake_ss):
    """Fields with default_factory=list must become [], not PydanticUndefined."""
    from ui.helpers import init_session_state

    init_session_state()

    list_fields = [
        "uploaded_diag_files",
        "diagnosticos_tabla",
        "conceptos_activos",
        "palabras_clave_activas",
    ]
    for name in list_fields:
        assert name in fake_ss, f"{name} was not initialized"
        assert fake_ss[name] == [], f"{name} got {fake_ss[name]!r}, expected []"
        assert isinstance(
            fake_ss[name], list
        ), f"{name} is {type(fake_ss[name])!r}, expected list"
        assert (
            fake_ss[name] is not PydanticUndefined
        ), f"{name} is the PydanticUndefined sentinel — bug regression!"


def test_optional_fields_initialize_as_none(fake_ss):
    """Optional[X] = Field(default=None) must become None."""
    from ui.helpers import init_session_state

    init_session_state()

    none_fields = [
        "session_id",
        "last_error",
        "last_generar_fn",
        "uploaded_tb_bytes",
        "uploaded_tb_name",
        "diagnosticos_texto",
        "res_m0a",
        "pptx_cache",
    ]
    for name in none_fields:
        assert name in fake_ss, f"{name} was not initialized"
        assert fake_ss[name] is None, f"{name} got {fake_ss[name]!r}, expected None"


def test_scalar_defaults_are_preserved(fake_ss):
    """Fields with literal defaults (bool/str/int) must keep those values."""
    from ui.helpers import init_session_state

    init_session_state()

    assert fake_ss["autenticado"] is False
    assert fake_ss["grado_nivel"] == "5to primaria"
    assert fake_ss["key_index"] == 0
    assert fake_ss["last_generar_json"] is False
    assert fake_ss["tema_activo"] == ""
    assert fake_ss["leccion_index"] == 0
    assert fake_ss["mostrar_adaptaciones_prev"] is False
    assert fake_ss["teacher_name"] == ""
    assert fake_ss["school_name"] == ""


def test_idempotent_does_not_overwrite_existing_values(fake_ss):
    """Calling init twice must not clobber user-set values."""
    from ui.helpers import init_session_state

    init_session_state()
    fake_ss["uploaded_diag_files"] = [("foo.pdf", b"bytes")]
    fake_ss["grado_nivel"] = "6to primaria"

    init_session_state()  # second call

    assert fake_ss["uploaded_diag_files"] == [("foo.pdf", b"bytes")]
    assert fake_ss["grado_nivel"] == "6to primaria"


def test_no_field_ends_up_as_pydantic_undefined(fake_ss):
    """Catch-all: no field in SessionData may end up as the sentinel."""
    from ui.helpers import init_session_state

    init_session_state()

    for name in SessionData.model_fields.keys():
        assert name in fake_ss, f"{name} missing from session_state"
        assert (
            fake_ss[name] is not PydanticUndefined
        ), f"{name} is PydanticUndefined — bug regression!"
