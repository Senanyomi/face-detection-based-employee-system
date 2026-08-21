from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from shared.middleware import require_auth
from analytics_service.models.productivity import ProductivityCreate
from analytics_service.controllers import productivity_controller

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/", summary="Record a productivity observation")
async def record_productivity(payload: ProductivityCreate):
    """Called by the AI pipeline after analysing a video frame window."""
    return productivity_controller.record_productivity(payload)


@router.get("/", summary="List productivity records", dependencies=[Depends(require_auth)])
async def list_records(
    employee_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return productivity_controller.list_records(employee_id, limit, offset)


@router.get("/aggregation/{employee_id}", summary="Aggregated productivity stats for an employee", dependencies=[Depends(require_auth)])
async def get_aggregation(employee_id: UUID):
    return productivity_controller.get_aggregation(employee_id)


@router.get("/daily-aggregation/{employee_id}", summary="Per-day average engagement score for an employee", dependencies=[Depends(require_auth)])
async def get_daily_aggregation(
    employee_id: UUID,
    limit: int = Query(31, ge=1, le=366),
    offset: int = Query(0, ge=0),
):
    return productivity_controller.get_daily_aggregation(employee_id, limit, offset)


@router.get("/{productivity_id}", summary="Get single productivity record", dependencies=[Depends(require_auth)])
async def get_record(productivity_id: UUID):
    return productivity_controller.get_record(productivity_id)
