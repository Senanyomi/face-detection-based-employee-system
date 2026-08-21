from uuid import UUID
from fastapi import HTTPException
from shared.utils.responses import success_response, error_response
from auth_service.models.employee import EmployeeCreate, EmployeeUpdate, ConsentUpdate
from auth_service.services import employee_service, token_service


def list_employees():
    data = employee_service.get_all_employees()
    return success_response("Employees retrieved", data)


def get_employee(employee_id: UUID):
    data = employee_service.get_employee_by_id(employee_id)
    return success_response("Employee retrieved", data)


def register_employee(payload: EmployeeCreate):
    data = employee_service.create_employee(payload)
    return success_response("Employee registered successfully", data)


def edit_employee(employee_id: UUID, payload: EmployeeUpdate):
    data = employee_service.update_employee(employee_id, payload)
    return success_response("Employee updated", data)


def remove_employee(employee_id: UUID):
    employee_service.delete_employee(employee_id)
    return success_response("Employee deleted")


def set_consent(employee_id: UUID, payload: ConsentUpdate):
    data = employee_service.update_consent(employee_id, payload.consent_status)
    status_label = "granted" if payload.consent_status else "revoked"
    return success_response(f"Consent {status_label}", data)


def set_face_embedding(employee_id: UUID, embedding_path: str):
    data = employee_service.update_face_embedding(employee_id, embedding_path)
    return success_response("Face embedding path updated", data)


def issue_token(employee_id: UUID):
    data = token_service.issue_token_for_employee(employee_id)
    return success_response("Token issued", data)