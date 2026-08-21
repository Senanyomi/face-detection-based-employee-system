from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import uuid


class AuditLogCreate(BaseModel):
    action: str
    performed_by: Optional[uuid.UUID] = None
    metadata: Optional[dict] = None


class AuditLogResponse(BaseModel):
    audit_id: uuid.UUID
    action: str
    performed_by: Optional[uuid.UUID]
    timestamp: datetime
    metadata: Optional[dict]
