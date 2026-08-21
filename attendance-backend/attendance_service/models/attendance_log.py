from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class EntryType(str, Enum):
    check_in = "check_in"
    check_out = "check_out"


class AttendanceLogCreate(BaseModel):
    employee_id: uuid.UUID
    entry_type: EntryType
    recognition_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    device_id: uuid.UUID


class AttendanceLogResponse(BaseModel):
    log_id: uuid.UUID
    employee_id: uuid.UUID
    timestamp: datetime
    entry_type: EntryType
    recognition_confidence: Optional[float]
    device_id: uuid.UUID


class AttendanceSummary(BaseModel):
    employee_id: uuid.UUID
    total_check_ins: int
    total_check_outs: int
    first_check_in: Optional[datetime]
    last_check_out: Optional[datetime]


class DailySummaryResponse(BaseModel):
    employee_id: uuid.UUID
    work_date: date
    total_duration_seconds: int
    first_check_in: Optional[datetime]
    last_check_out: Optional[datetime]
