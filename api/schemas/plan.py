"""
api/schemas/plan.py — Plan Schemas
==================================
"""

from typing import Any, Optional
from pydantic import BaseModel


class PlanRequest(BaseModel):
    result: Any
    metadata: Optional[dict] = None


class PlanResponse(BaseModel):
    plan_type: str
    result: Any
    metadata: Optional[dict] = None
    created_at: Optional[str] = None
