"""
Token service — issues JWT tokens for authenticated devices/admins.
In production, this would validate a device API key or admin credentials
before issuing a token. For now it issues a token for a verified employee_id.
"""
from uuid import UUID
from fastapi import HTTPException, status
from shared.utils.jwt import create_access_token
from auth_service.services import employee_service


def issue_token_for_employee(employee_id: UUID) -> dict:
    """
    Verifies the employee exists and has given consent,
    then returns a signed JWT embedding their ID and role.
    """
    employee = employee_service.get_employee_by_id(employee_id)

    if not employee["consent_status"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee has not given biometric consent. Token not issued.",
        )

    token = create_access_token(data={
        "sub": str(employee["employee_id"]),
        "role": employee.get("role", "employee"),
        "department": employee.get("department"),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "employee_id": str(employee["employee_id"]),
    }
