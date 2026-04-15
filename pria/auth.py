"""Re-export from pria_docs."""

from pria_docs.auth import (
    Role,
    get_current_user,
    is_admin,
    is_teacher,
    check_permission,
    generate_salt,
    hash_password,
    verify_password,
    require_role,
)
