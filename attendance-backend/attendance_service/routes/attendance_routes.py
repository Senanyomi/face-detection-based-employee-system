from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from shared.middleware import require_auth
from attendance_service.models.attendance_log import AttendanceLogCreate
from attendance_service.controllers import attendance_controller

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/", summary="Log an attendance event (check-in or check-out)")
async def log_attendance(payload: AttendanceLogCreate):
    """
    Called by the face-recognition pipeline immediately after a successful match.
    No auth required here — the pipeline uses the service role internally.
    """
    return attendance_controller.log_attendance(payload)


@router.get("/", summary="List attendance logs", dependencies=[Depends(require_auth)])
async def list_logs(
    employee_id: Optional[UUID] = Query(None, description="Filter by employee"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return attendance_controller.list_logs(employee_id, limit, offset)


@router.get("/summary/{employee_id}", summary="Get attendance summary for an employee", dependencies=[Depends(require_auth)])
async def employee_summary(employee_id: UUID):
    return attendance_controller.employee_summary(employee_id)


@router.get("/daily-summary/{employee_id}", summary="Get per-day worked duration for an employee", dependencies=[Depends(require_auth)])
async def daily_summaries(
    employee_id: UUID,
    limit: int = Query(31, ge=1, le=366),
    offset: int = Query(0, ge=0),
):
    return attendance_controller.daily_summaries(employee_id, limit, offset)


@router.get("/daily-summary", summary="Get reconciled daily attendance summaries", dependencies=[Depends(require_auth)])
async def reconciled_daily_summaries(date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")):
    return attendance_controller.reconciled_daily_summaries(date)


@router.get("/device/{device_id}", summary="Get logs by device", dependencies=[Depends(require_auth)])
async def logs_by_device(device_id: UUID, limit: int = Query(50, ge=1, le=500)):
    return attendance_controller.logs_by_device(device_id, limit)


@router.get("/{log_id}", summary="Get a single attendance log", dependencies=[Depends(require_auth)])
async def get_log(log_id: UUID):
    return attendance_controller.get_log(log_id)