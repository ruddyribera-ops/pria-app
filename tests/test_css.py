"""
test_css.py — Tests for ui/css.py
===============================
Verifies CSS design system is valid and non-empty.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestCSS:
    def test_css_is_non_empty(self):
        from ui.css import CSS

        assert CSS, "CSS should not be empty"
        assert len(CSS) > 100, "CSS should have substantial content"

    def test_css_contains_design_tokens(self):
        from ui.css import CSS

        # Check CSS custom properties (design tokens)
        assert "--bg:" in CSS, "Should define --bg background token"
        assert "--surface:" in CSS, "Should define --surface token"
        assert "--blue:" in CSS, "Should define --blue accent token"
        assert "--text-1:" in CSS, "Should define --text-1 token"
        assert "--emerald:" in CSS, "Should define --emerald token"

    def test_css_contains_st_variables(self):
        from ui.css import CSS

        # Check Streamlit-specific overrides
        assert ".stApp" in CSS, "Should style .stApp"
        assert ".stButton" in CSS, "Should style .stButton"
        assert ".stMarkdown" in CSS, "Should style .stMarkdown"
        assert ".stDataFrame" in CSS, "Should style .stDataFrame"
        assert "stTabs" in CSS, "Should style tabs"  # div[data-testid="stTabs"]

    def test_css_contains_custom_classes(self):
        from ui.css import CSS

        # Check custom PRIA classes
        assert "aid-day-header" in CSS, "Should define .aid-day-header"
        assert "aid-badge" in CSS, "Should define .aid-badge"
        assert "aid-time" in CSS, "Should define .aid-time"

    def test_css_uses_inter_font(self):
        from ui.css import CSS

        assert "Inter" in CSS, "Should reference Inter font"

    def test_css_is_valid_html_style_block(self):
        from ui.css import CSS

        assert "<style>" in CSS, "Should be wrapped in <style> tag"
        assert "</style>" in CSS, "Should close <style> tag"
