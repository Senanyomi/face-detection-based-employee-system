from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ── Database row representation ───────────────────────────────────────────────

class EmployeeDB(BaseModel):
    """Mirrors auth_service.employees exactly."""
    employee_id: uuid.UUID
    full_name: str
    department: Optional[str] = None
    role: Optional[str] = None
    face_embedding_path: Optional[str] = None
    consent_status: bool
    date_registered: datetime

    class Config:
        from_attributes = True


# ── Request bodies ─────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    consent_status: bool = False


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = None
    role: Optional[str] = None
    face_embedding_path: Optional[str] = None
    consent_status: Optional[bool] = None


class ConsentUpdate(BaseModel):
    consent_status: bool


# ── Response bodies ────────────────────────────────────────────────────────────

class EmployeeResponse(BaseModel):
    employee_id: uuid.UUID
    full_name: str
    department: Optional[str]
    role: Optional[str]
    consent_status: bool
    date_registered: datetime
    # face_embedding_path intentionally excluded from API responses


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee_id: str