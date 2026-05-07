"""Validation utilities for PDC operations."""

from typing import Dict, Any, List


VALID_PROFILES = {"dyslexia", "adhd", "autism", "dyscalculia"}


def validate_mescp_row(data: Dict[str, Any]) -> bool:
    """Validate that all 6 MESCP columns are present and non-empty.

    Args:
        data: Dictionary with objective, contenidos, momentos, recursos, periodos, criterios

    Returns:
        True if valid, raises ValueError otherwise
    """
    required_columns = ["objetivo", "contenidos", "momentos", "recursos", "periodos", "criterios"]

    for column in required_columns:
        if column not in data:
            raise ValueError(f"Missing required MESCP column: {column}")
        if not data[column] or not str(data[column]).strip():
            raise ValueError(f"MESCP column '{column}' cannot be empty")

    return True


def validate_pdc_name(name: str) -> bool:
    """Validate PDC name/title.

    Args:
        name: PDC title

    Returns:
        True if valid, raises ValueError otherwise
    """
    if not name or not isinstance(name, str):
        raise ValueError("PDC name must be a non-empty string")

    name = name.strip()
    if len(name) == 0:
        raise ValueError("PDC name cannot be empty after trimming")

    if len(name) > 200:
        raise ValueError("PDC name cannot exceed 200 characters")

    return True


def validate_profile(profile: str) -> bool:
    """Validate neuroinclusive profile.

    Args:
        profile: Profile name (dyslexia, adhd, autism, dyscalculia)

    Returns:
        True if valid, raises ValueError otherwise
    """
    if not isinstance(profile, str):
        raise ValueError("Profile must be a string")

    profile = profile.lower().strip()
    if profile not in VALID_PROFILES:
        raise ValueError(
            f"Invalid profile: {profile}. Must be one of: {', '.join(sorted(VALID_PROFILES))}"
        )

    return True


def validate_profiles(profiles: List[str]) -> bool:
    """Validate list of profiles.

    Args:
        profiles: List of profile names

    Returns:
        True if all valid, raises ValueError otherwise
    """
    if not profiles:
        raise ValueError("At least one profile must be specified")

    for profile in profiles:
        validate_profile(profile)

    return True
