from uuid import UUID
from typing import Optional
from shared.utils.responses import success_response
from analytics_service.models.productivity import ProductivityCreate
from analytics_service.services import productivity_service


def record_productivity(payload: ProductivityCreate):
    data = productivity_service.create_record(payload)
    return success_response("Productivity recorded", data)


def list_records(employee_id: Optional[UUID], limit: int, offset: int):
    data = productivity_service.get_records(employee_id, limit, offset)
    return success_response("Records retrieved", data)


def get_record(productivity_id: UUID):
    data = productivity_service.get_record_by_id(productivity_id)
    return success_response("Record retrieved", data)


def get_aggregation(employee_id: UUID):
    data = productivity_service.get_aggregation(employee_id)
    return success_response("Aggregation retrieved", data)


def get_daily_aggregation(employee_id: UUID, limit: int, offset: int):
    data = productivity_service.get_daily_aggregation(employee_id, limit, offset)
    return success_response("Daily aggregation retrieved", data)
