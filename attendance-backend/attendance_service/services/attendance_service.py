from uuid import UUID
from typing import Optional
from datetime import date, datetime, time, timedelta, timezone
import logging
from fastapi import HTTPException, status
from shared.db.client import get_db, get_table
from attendance_service.models.attendance_log import AttendanceLogCreate, EntryType
from processors.attendance_reconciler import reconcile_employee_logs, write_summary

SCHEMA = "attendance_service"
TABLE = "logs"
DAILY_SUMMARY_TABLE = "daily_summaries"
log = logging.getLogger(__name__)


def create_log(payload: AttendanceLogCreate) -> dict:
    data = {
        "employee_id": str(payload.employee_id),
        "entry_type": payload.entry_type.value,
        "recognition_confidence": payload.recognition_confidence,
        "device_id": str(payload.device_id),
    }
    result = get_table(SCHEMA, TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create attendance log")
    row = result.data[0]

    work_date = datetime.fromisoformat(row["timestamp"]).date()

    # A day's total worked duration can only change once it has a new
    # closing check_out, so that's the only time we recompute it.
    if payload.entry_type == EntryType.check_out:
        try:
            recompute_daily_summary(payload.employee_id, work_date)
        except Exception:
            log.exception("Unable to update duration summary for %s", payload.employee_id)

    # Keep the reconciled view current for the frontend instead of waiting
    # for the periodic processor loop.
    try:
        recompute_reconciled_daily_summary(payload.employee_id, work_date)
    except Exception:
        log.exception("Unable to update reconciled summary for %s", payload.employee_id)

    return row


def recompute_reconciled_daily_summary(employee_id: UUID, work_date: date) -> dict:
    """Upsert the collapsed first-in/last-out summary for one employee-day."""
    day_start = datetime.combine(work_date, time.min, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    entries = (
        get_table(SCHEMA, TABLE)
        .select("entry_type, timestamp")
        .eq("employee_id", str(employee_id))
        .gte("timestamp", day_start.isoformat())
        .lt("timestamp", day_end.isoformat())
        .order("timestamp")
        .execute()
        .data
    )
    result = reconcile_employee_logs(entries or [])
    client = get_db()
    write_summary(client, str(employee_id), work_date, result)
    return result


def recompute_daily_summary(employee_id: UUID, work_date: date) -> dict:
    """Recomputes and upserts one employee's total worked duration for one
    calendar day, by pairing every check_in with the next check_out that day
    (so stepping out and back — e.g. lunch — is summed, not just wall-clock
    first-in to last-out). A trailing check_in with no matching check_out
    yet contributes nothing until it's closed."""
    day_start = datetime.combine(work_date, time.min, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    day_logs = (
        get_table(SCHEMA, TABLE)
        .select("*")
        .eq("employee_id", str(employee_id))
        .gte("timestamp", day_start.isoformat())
        .lt("timestamp", day_end.isoformat())
        .order("timestamp")
        .execute()
        .data
    )

    total_seconds = 0.0
    open_check_in: Optional[datetime] = None
    first_check_in: Optional[datetime] = None
    last_check_out: Optional[datetime] = None

    for log in day_logs:
        ts = datetime.fromisoformat(log["timestamp"])
        if log["entry_type"] == "check_in":
            if first_check_in is None:
                first_check_in = ts
            open_check_in = ts
        elif log["entry_type"] == "check_out":
            if open_check_in is not None:
                total_seconds += (ts - open_check_in).total_seconds()
                open_check_in = None
            last_check_out = ts

    summary_data = {
        "employee_id": str(employee_id),
        "work_date": work_date.isoformat(),
        "total_duration_seconds": int(total_seconds),
        "first_check_in": first_check_in.isoformat() if first_check_in else None,
        "last_check_out": last_check_out.isoformat() if last_check_out else None,
    }
    get_table(SCHEMA, DAILY_SUMMARY_TABLE) \
        .upsert(summary_data, on_conflict="employee_id,work_date") \
        .execute()
    return summary_data


def get_daily_duration_summaries(employee_id: UUID, limit: int = 31, offset: int = 0) -> list[dict]:
    return (
        get_table(SCHEMA, DAILY_SUMMARY_TABLE)
        .select("*")
        .eq("employee_id", str(employee_id))
        .order("work_date", desc=True)
        .limit(limit)
        .offset(offset)
        .execute()
        .data
    )


def get_logs(employee_id: Optional[UUID] = None, limit: int = 50, offset: int = 0) -> list[dict]:
    query = get_table(SCHEMA, TABLE).select("*").order("timestamp", desc=True).limit(limit).offset(offset)
    if employee_id:
        query = query.eq("employee_id", str(employee_id))
    return query.execute().data


def get_log_by_id(log_id: UUID) -> dict:
    result = get_table(SCHEMA, TABLE).select("*").eq("log_id", str(log_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Log {log_id} not found")
    return result.data[0]


def get_employee_summary(employee_id: UUID) -> dict:
    logs = get_table(SCHEMA, TABLE).select("*").eq("employee_id", str(employee_id)).execute().data
    check_ins = [l for l in logs if l["entry_type"] == "check_in"]
    check_outs = [l for l in logs if l["entry_type"] == "check_out"]
    return {
        "employee_id": str(employee_id),
        "total_check_ins": len(check_ins),
        "total_check_outs": len(check_outs),
        "first_check_in": min((l["timestamp"] for l in check_ins), default=None),
        "last_check_out": max((l["timestamp"] for l in check_outs), default=None),
    }


def get_logs_by_device(device_id: UUID, limit: int = 50) -> list[dict]:
    return get_table(SCHEMA, TABLE).select("*").eq("device_id", str(device_id)).order("timestamp", desc=True).limit(limit).execute().data


def get_reconciled_daily_summaries(target_date: Optional[str] = None) -> list[dict]:
    """Returns reconciled daily attendance summaries."""
    query = get_table(SCHEMA, "daily_summary").select("*").order("summary_date", desc=True)
    if target_date:
        query = query.eq("summary_date", target_date)
    return query.execute().data