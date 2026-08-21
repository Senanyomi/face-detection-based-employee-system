import json
from uuid import UUID
from typing import Optional
from fastapi import HTTPException
from shared.db.client import get_table

SCHEMA = "audit_service"
TABLE = "logs"


def create_log(payload) -> dict:
    data = {
        "action": payload.action,
        "performed_by": str(payload.performed_by) if payload.performed_by else None,
        "metadata": json.dumps(payload.metadata) if payload.metadata else None,
    }
    result = get_table(SCHEMA, TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create audit log")
    return result.data[0]


def get_logs(performed_by: Optional[UUID] = None, limit: int = 50, offset: int = 0) -> list[dict]:
    query = get_table(SCHEMA, TABLE).select("*").order("timestamp", desc=True).limit(limit).offset(offset)
    if performed_by:
        query = query.eq("performed_by", str(performed_by))
    return query.execute().data


def get_log_by_id(audit_id: UUID) -> dict:
    result = get_table(SCHEMA, TABLE).select("*").eq("audit_id", str(audit_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Audit log {audit_id} not found")
    return result.data[0]