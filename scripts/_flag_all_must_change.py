"""
scripts/_flag_all_must_change.py — Task 2 Step 5
================================================
Idempotent: set must_change_password=1 for ALL existing users.
Run once on prod to activate force-change for the 17 existing users.
Safe to run multiple times (no-op if already set).
"""

import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db._base import _conn

with _conn() as c:
    c.execute("UPDATE usuarios SET must_change_password = 1")
    print("OK: must_change_password=1 set for all existing users")
