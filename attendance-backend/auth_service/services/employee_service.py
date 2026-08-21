from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from shared.db.client import get_table
from auth_service.models.employee import EmployeeCreate, EmployeeUpdate

SCHEMA = "auth_service"
TABLE = "employees"


def get_all_employees() -> list[dict]:
    result = get_table(SCHEMA, TABLE).select(
        "employee_id, full_name, department, role, consent_status, date_registered"
    ).execute()
    return result.data


def get_employee_by_id(employee_id: UUID) -> dict:
    result = get_table(SCHEMA, TABLE).select(
        "employee_id, full_name, department, role, consent_status, date_registered"
    ).eq("employee_id", str(employee_id)).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )
    return result.data[0]


def create_employee(payload: EmployeeCreate) -> dict:
    result = get_table(SCHEMA, TABLE).insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create employee",
        )
    row = result.data[0]
    row.pop("face_embedding_path", None)
    return row


def update_employee(employee_id: UUID, payload: EmployeeUpdate) -> dict:
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )
    result = get_table(SCHEMA, TABLE).update(changes).eq("employee_id", str(employee_id)).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )
    row = result.data[0]
    row.pop("face_embedding_path", None)
    return row


def delete_employee(employee_id: UUID) -> bool:
    result = get_table(SCHEMA, TABLE).delete().eq("employee_id", str(employee_id)).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )
    return True


def update_consent(employee_id: UUID, consent_status: bool) -> dict:
    result = get_table(SCHEMA, TABLE).update(
        {"consent_status": consent_status}
    ).eq("employee_id", str(employee_id)).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )
    return result.data[0]


def update_face_embedding(employee_id: UUID, embedding_path: str) -> dict:
    result = get_table(SCHEMA, TABLE).update(
        {"face_embedding_path": embedding_path}
    ).eq("employee_id", str(employee_id)).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee {employee_id} not found",
        )
    return result.data[0]