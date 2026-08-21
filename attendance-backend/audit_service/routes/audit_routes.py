from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from shared.middleware import require_auth
from audit_service.models.audit_log import AuditLogCreate
from audit_service.controllers import audit_controller

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.post("/", summary="Write an audit log entry")
async def write_log(payload: AuditLogCreate):
    """
    Called by any service when a sensitive action occurs
    (consent change, employee deletion, login, etc.).
    """
    return audit_controller.write_log(payload)


@router.get("/", summary="List audit logs", dependencies=[Depends(require_auth)])
async def list_logs(
    performed_by: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return audit_controller.list_logs(performed_by, limit, offset)


@router.get("/{audit_id}", summary="Get a single audit log", dependencies=[Depends(require_auth)])
async def get_log(audit_id: UUID):
    return audit_controller.get_log(audit_id)
