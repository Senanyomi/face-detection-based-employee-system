from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from shared.middleware import require_auth
from auth_service.models.employee import EmployeeCreate, EmployeeUpdate, ConsentUpdate
from auth_service.controllers import employee_controller

router = APIRouter(prefix="/employees", tags=["Employees"])


# ── Public endpoints (no auth required) ──────────────────────────────────────

@router.post("/", summary="Register a new employee")
async def register_employee(payload: EmployeeCreate):
    return employee_controller.register_employee(payload)


@router.post("/{employee_id}/token", summary="Issue a JWT for an employee")
async def issue_token(employee_id: UUID):
    return employee_controller.issue_token(employee_id)


@router.get("/{employee_id}", summary="Get employee by ID")
async def get_employee(employee_id: UUID):
    return employee_controller.get_employee(employee_id)


# ── Protected endpoints (require Bearer token) ────────────────────────────────

@router.get("/", summary="List all employees", dependencies=[Depends(require_auth)])
async def list_employees():
    return employee_controller.list_employees()


@router.patch("/{employee_id}", summary="Update employee details", dependencies=[Depends(require_auth)])
async def update_employee(employee_id: UUID, payload: EmployeeUpdate):
    return employee_controller.edit_employee(employee_id, payload)


@router.delete("/{employee_id}", summary="Delete an employee", dependencies=[Depends(require_auth)])
async def delete_employee(employee_id: UUID):
    return employee_controller.remove_employee(employee_id)


@router.patch("/{employee_id}/consent", summary="Update biometric consent", dependencies=[Depends(require_auth)])
async def update_consent(employee_id: UUID, payload: ConsentUpdate):
    return employee_controller.set_consent(employee_id, payload)


@router.patch("/{employee_id}/face-embedding", summary="Update face embedding path", dependencies=[Depends(require_auth)])
async def update_face_embedding(employee_id: UUID, embedding_path: str):
    return employee_controller.set_face_embedding(employee_id, embedding_path)