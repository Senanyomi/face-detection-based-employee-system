from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class DeviceStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"


class DeviceCreate(BaseModel):
    location: str = Field(..., min_length=2, max_length=200)
    status: DeviceStatus = DeviceStatus.active


class DeviceUpdate(BaseModel):
    location: Optional[str] = Field(None, min_length=2, max_length=200)
    status: Optional[DeviceStatus] = None


class DeviceResponse(BaseModel):
    device_id: uuid.UUID
    location: str
    status: DeviceStatus
    last_heartbeat: Optional[datetime]


class HeartbeatResponse(BaseModel):
    device_id: uuid.UUID
    last_heartbeat: datetime
    status: DeviceStatus
