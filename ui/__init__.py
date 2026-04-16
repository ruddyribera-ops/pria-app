# ui/ - PRIA User Interface Modules
#
# Split from app_ui.py for maintainability:
# - helpers.py   : CSS, session state, helpers, PDF/Gemini processing
# - auth_ui.py   : Login UI
# - sidebar.py   : Sidebar content
# - admin_ui.py  : Admin panel (files, users, reset)
# - daily_ui.py  : Daily view integration
# - weekly_ui.py : Weekly plan tabs (clase, diap, ficha, quiz, export)
# - trimester_ui.py : Trimester plan tabs (unidad ABP, PDC)

from ui.helpers import CSS, init_session_state, helpers
from ui.auth_ui import render_login
from ui.sidebar import render_sidebar
from ui.admin_ui import render_admin_panel
from ui.daily_ui import render_daily_zone
from ui.weekly_ui import render_weekly_zone
from ui.trimester_ui import render_trimester_zone

__all__ = [
    "CSS",
    "init_session_state",
    "helpers",
    "render_login",
    "render_sidebar",
    "render_admin_panel",
    "render_daily_zone",
    "render_weekly_zone",
    "render_trimester_zone",
]
