from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum
import uuid


class PostureState(str, Enum):
    focused = "focused"
    distracted = "distracted"
    away = "away"
    unknown = "unknown"


class ProductivityCreate(BaseModel):
    employee_id: uuid.UUID
    identified_employee: str = Field(..., min_length=1)
    worker_id: str = Field(..., min_length=1)
    posture_state: PostureState = PostureState.unknown
    engagement_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    duration_seconds: int = Field(..., ge=0)


class ProductivityResponse(BaseModel):
    productivity_id: uuid.UUID
    employee_id: uuid.UUID
    identified_employee: str
    worker_id: str
    posture_state: PostureState
    engagement_score: Optional[float]
    duration_seconds: int
    timestamp: datetime


class ProductivityAggregation(BaseModel):
    employee_id: uuid.UUID
    average_engagement: Optional[float]
    total_focused_seconds: int
    total_distracted_seconds: int
    total_away_seconds: int
    observation_count: int


class DailyEngagementResponse(BaseModel):
    employee_id: uuid.UUID
    work_date: date
    average_engagement_score: Optional[float]
    observation_count: int
