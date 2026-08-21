from uuid import UUID
from typing import Optional
from shared.utils.responses import success_response
from attendance_service.models.attendance_log import AttendanceLogCreate
from attendance_service.services import attendance_service


def log_attendance(payload: AttendanceLogCreate):
    data = attendance_service.create_log(payload)
    return success_response("Attendance logged", data)


def list_logs(employee_id: Optional[UUID], limit: int, offset: int):
    data = attendance_service.get_logs(employee_id, limit, offset)
    return success_response("Logs retrieved", data)


def get_log(log_id: UUID):
    data = attendance_service.get_log_by_id(log_id)
    return success_response("Log retrieved", data)


def employee_summary(employee_id: UUID):
    data = attendance_service.get_employee_summary(employee_id)
    return success_response("Summary retrieved", data)


def daily_summaries(employee_id: UUID, limit: int, offset: int):
    data = attendance_service.get_daily_duration_summaries(employee_id, limit, offset)
    return success_response("Daily summaries retrieved", data)


def reconciled_daily_summaries(target_date: Optional[str]):
    data = attendance_service.get_reconciled_daily_summaries(target_date)
    return success_response("Reconciled daily summaries retrieved", data)


def logs_by_device(device_id: UUID, limit: int):
    data = attendance_service.get_logs_by_device(device_id, limit)
    return success_response("Device logs retrieved", data)
