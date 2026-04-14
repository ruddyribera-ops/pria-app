# PRIA - Palma-Rivera Intelligent Assistant
# Core package re-exports from pria_docs

from pria.config import config, C
from pria.errors import error_handled, log_user_action, handle_error, PRIAError
from pria.auth import Role, get_current_user, is_admin, is_teacher, check_permission
from pria.motors.integration import (
    load_motor_prompt,
    get_motor_stats,
    render_motor_dashboard,
)
