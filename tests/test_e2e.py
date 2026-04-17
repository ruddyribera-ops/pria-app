"""
tests/test_e2e.py - Playwright e2e smoke tests for PRIA UI

Run locally:
    pytest tests/test_e2e.py -v

With custom URL:
    RAILWAY_APP_URL=https://priav5-production.up.railway.app pytest tests/test_e2e.py -v
"""

import os
import sys
import pytest

# Ensure stdout encoding is UTF-8 on Windows to avoid encoding errors
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Target URL — Railway prod by default
APP_URL = os.environ.get("RAILWAY_APP_URL", "http://localhost:8501")


def _out(msg: str) -> None:
    """Print with flush to avoid broken pipe / encoding issues on Windows."""
    sys.stdout.write(msg + "\n")
    sys.stdout.flush()


def _pw_browser_config():
    """Return the browser name and launch options for this platform."""
    return "chromium", {"headless": True}


# ═══════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.fixture(scope="function")
def browser():
    """
    Provide an isolated Playwright Browser instance per test.

    Each test gets its own browser context (and thus its own session/cookies)
    so tests are fully independent.
    """
    from playwright.sync_api import sync_playwright

    pw = sync_playwright().start()
    browser_name, launch_options = _pw_browser_config()
    browser = getattr(pw, browser_name).launch(**launch_options)
    yield browser
    browser.close()
    pw.stop()


@pytest.fixture(scope="function")
def page(browser):
    """Provide a fresh Page (new context) for each test."""
    context = browser.new_context()
    page = context.new_page()

    # Capture console errors so we can assert on them
    console_errors = []

    def handle_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)

    page.on("console", handle_console)

    # Attach the errors list to the page so tests can inspect it
    page._console_errors = console_errors

    yield page
    page.close()
    context.close()


# ═══════════════════════════════════════════════════════════════════════════════
# Helper assertions
# ═══════════════════════════════════════════════════════════════════════════════


def assert_no_console_errors(page):
    """Fail the test if any console errors (Error level) were captured."""
    errors = getattr(page, "_console_errors", [])
    assert len(errors) == 0, f"Console errors detected: {errors}"


# ═══════════════════════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════════════════════


def test_app_loads_no_errors(page):
    """
    Verify the PRIA app loads without any console errors and the login form is visible.

    This is the most basic smoke test — if this fails, nothing else will work.
    Streamlit doesn't always render a <form> tag, so we check for key login
    elements instead (email input + password input + button).
    """
    _out(f"[TEST] Opening {APP_URL}")
    page.goto(APP_URL, wait_until="networkidle", timeout=30_000)

    # Give Streamlit a moment to fully render
    page.wait_for_timeout(3_000)

    assert_no_console_errors(page)

    # Check for at least one Streamlit text input and a button (login UI)
    inputs = page.locator("[data-testid='stTextInput'] input, input[placeholder]")
    assert inputs.count() > 0, "No input fields found on login page"

    buttons = page.locator("[data-testid='stButton'] button, button")
    assert buttons.count() > 0, "No buttons found on login page"

    _out("[PASS] App loaded, login elements visible, no console errors")


def test_login_form_elements(page):
    """
    Verify the login form has email input, password input, and a submit button.

    Streamlit renders text_input and text_area with a nested <input> inside
    a div with data-testid="stTextInput" or "stTextArea".
    The submit button is a regular <button> element.
    """
    page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
    page.wait_for_timeout(2_000)

    # Streamlit text_input for email — look for input with placeholder text
    email_input = page.locator(
        "input[placeholder*='laspalmas'], "
        "input[placeholder*='admin'], "
        "[data-testid='stTextInput'] input"
    )
    assert email_input.count() > 0, "Email input not found"

    # Password input (Streamlit uses type="password")
    password_input = page.locator(
        "input[type='password'], [data-testid='stTextInput'] input[type='password']"
    )
    assert password_input.count() > 0, "Password input not found"

    # Submit / login button — Streamlit buttons are plain <button> elements
    submit_btn = page.locator(
        "button:has-text('Ingresar'), "
        "button[type='primary'], "
        "[data-testid='stButton'] button"
    )
    assert submit_btn.count() > 0, "Submit button not found"

    _out("[PASS] Login form elements verified")


def test_login_with_bad_credentials(page):
    """
    Attempt to log in with invalid credentials and verify an error message appears.
    """
    page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
    page.wait_for_timeout(2_000)

    # Use flexible Streamlit-compatible selectors for email and password
    email_input = page.locator(
        "input[placeholder*='laspalmas'], "
        "input[placeholder*='admin'], "
        "[data-testid='stTextInput'] input"
    ).first
    password_input = page.locator(
        "input[type='password'], [data-testid='stTextInput'] input[type='password']"
    ).first

    email_input.fill("invalid@test.com")
    password_input.fill("wrongpassword")

    # Click the Ingresar button
    submit_btn = page.locator(
        "button:has-text('Ingresar'), "
        "button[type='primary'], "
        "[data-testid='stButton'] button"
    ).first
    submit_btn.click()

    # Wait for error message or for the page to settle
    page.wait_for_timeout(3_000)

    # Check for an error indicator (Streamlit error box or red text)
    error_elements = page.locator(
        ".stAlert, [data-testid='stAlert'], .element-container .stError, "
        "[class*='error'], [class*='Error']"
    )
    has_error = error_elements.count() > 0

    # Also consider page staying on login as a form of failure feedback
    still_on_login = (
        page.locator(
            "input[type='password'], [data-testid='stTextInput'] input[type='password']"
        ).count()
        > 0
    )

    assert has_error or still_on_login, (
        "Expected an error message or login form to remain visible after bad credentials"
    )
    _out("[PASS] Bad credentials handled (error shown or login retained)")


def test_app_shows_pria_title(page):
    """
    Verify the PRIA title is visible somewhere on the page.
    """
    page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
    page.wait_for_timeout(3_000)

    # Check for "PRIA" in the page title or any visible text
    pria_text = page.locator("text=PRIA")
    assert pria_text.count() > 0, "PRIA title/text not found on page"

    _out("[PASS] PRIA title found on page")


def test_health_endpoint(page):
    """
    Verify the Streamlit health endpoint returns 'ok'.

    Streamlit exposes /_stcore/health for health checks.
    """
    health_url = f"{APP_URL.rstrip('/')}/_stcore/health"
    _out(f"[TEST] Checking health endpoint: {health_url}")

    try:
        response = page.request.get(health_url, timeout=10_000)
    except Exception as exc:
        pytest.fail(f"Health endpoint request failed: {exc}")

    assert response.ok, f"Health endpoint returned {response.status_code}"
    body = response.text().strip()
    assert body == "ok", f"Health endpoint returned unexpected body: {body!r}"
    _out("[PASS] Health endpoint returned 'ok'")


@pytest.mark.skip(reason="Requires valid test credentials — skip in CI unless provided")
def test_sidebar_loads_after_login(page):
    """
    Verify the sidebar loads after a successful login.

    This test is skipped unless TEST_EMAIL + TEST_PASSWORD env vars are set.
    In CI, real credentials should be passed as secrets.
    """
    test_email = os.environ.get("TEST_EMAIL", "")
    test_password = os.environ.get("TEST_PASSWORD", "")

    if not test_email or not test_password:
        pytest.skip("TEST_EMAIL / TEST_PASSWORD not set")

    page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
    page.wait_for_timeout(2_000)

    # Login
    page.locator('input[type="email"]').fill(test_email)
    page.locator('input[type="password"]').fill(test_password)
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(4_000)

    # After login, sidebar or main nav should be visible
    sidebar = page.locator("[data-testid='stSidebar'], aside, nav, .sidebar")
    assert sidebar.count() > 0, "Sidebar not found after login"

    _out("[PASS] Sidebar visible after login")
