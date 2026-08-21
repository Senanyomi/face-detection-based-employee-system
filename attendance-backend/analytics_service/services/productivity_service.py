from uuid import UUID
from typing import Optional
from datetime import datetime
from fastapi import HTTPException, status
from shared.db.client import get_table
from analytics_service.models.productivity import ProductivityCreate

SCHEMA = "analytics_service"
TABLE = "productivity"


def create_record(payload: ProductivityCreate) -> dict:
    data = {
        "employee_id": str(payload.employee_id),
        "identified_employee": payload.identified_employee,
        "worker_id": payload.worker_id,
        "posture_state": payload.posture_state.value,
        "engagement_score": payload.engagement_score,
        "duration_seconds": payload.duration_seconds,
    }
    result = get_table(SCHEMA, TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create productivity record")
    return result.data[0]


def get_records(employee_id: Optional[UUID] = None, limit: int = 50, offset: int = 0) -> list[dict]:
    query = get_table(SCHEMA, TABLE).select("*").order("timestamp", desc=True).limit(limit).offset(offset)
    if employee_id:
        query = query.eq("employee_id", str(employee_id))
    return query.execute().data


def get_record_by_id(productivity_id: UUID) -> dict:
    result = get_table(SCHEMA, TABLE).select("*").eq("productivity_id", str(productivity_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Record {productivity_id} not found")
    return result.data[0]


def get_aggregation(employee_id: UUID) -> dict:
    records = get_table(SCHEMA, TABLE).select("*").eq("employee_id", str(employee_id)).execute().data
    if not records:
        return {"employee_id": str(employee_id), "average_engagement": None,
                "total_focused_seconds": 0, "total_distracted_seconds": 0,
                "total_away_seconds": 0, "observation_count": 0}
    scores = [r["engagement_score"] for r in records if r["engagement_score"] is not None]
    return {
        "employee_id": str(employee_id),
        "average_engagement": round(sum(scores) / len(scores), 4) if scores else None,
        "total_focused_seconds": sum(r["duration_seconds"] for r in records if r["posture_state"] == "focused"),
        "total_distracted_seconds": sum(r["duration_seconds"] for r in records if r["posture_state"] == "distracted"),
        "total_away_seconds": sum(r["duration_seconds"] for r in records if r["posture_state"] == "away"),
        "observation_count": len(records),
    }


def get_daily_aggregation(employee_id: UUID, limit: int = 31, offset: int = 0) -> list[dict]:
    """Average engagement_score per calendar day, derived from the same raw
    productivity records get_aggregation already pulls — just grouped by day
    instead of collapsed into a single all-time number."""
    records = get_table(SCHEMA, TABLE).select("*").eq("employee_id", str(employee_id)).execute().data

    scores_by_day: dict[str, list[float]] = {}
    for r in records:
        if r["engagement_score"] is None:
            continue
        work_date = datetime.fromisoformat(r["timestamp"]).date().isoformat()
        scores_by_day.setdefault(work_date, []).append(r["engagement_score"])

    daily = [
        {
            "employee_id": str(employee_id),
            "work_date": work_date,
            "average_engagement_score": round(sum(scores) / len(scores), 4),
            "observation_count": len(scores),
        }
        for work_date, scores in scores_by_day.items()
    ]
    daily.sort(key=lambda r: r["work_date"], reverse=True)
    return daily[offset:offset + limit]