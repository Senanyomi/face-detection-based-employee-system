from uuid import UUID
from typing import Optional
from shared.utils.responses import success_response
from audit_service.models.audit_log import AuditLogCreate
from audit_service.services import audit_service


def write_log(payload: AuditLogCreate):
    data = audit_service.create_log(payload)
    return success_response("Audit log written", data)


def list_logs(performed_by: Optional[UUID], limit: int, offset: int):
    data = audit_service.get_logs(performed_by, limit, offset)
    return success_response("Audit logs retrieved", data)


def get_log(audit_id: UUID):
    data = audit_service.get_log_by_id(audit_id)
    return success_response("Audit log retrieved", data)
