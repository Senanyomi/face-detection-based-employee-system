from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from shared.db.client import get_table
from device_service.models.device import DeviceCreate, DeviceUpdate

SCHEMA = "device_service"
TABLE = "devices"


def get_all_devices() -> list[dict]:
    return get_table(SCHEMA, TABLE).select("*").execute().data


def get_device_by_id(device_id: UUID) -> dict:
    result = get_table(SCHEMA, TABLE).select("*").eq("device_id", str(device_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return result.data[0]


def create_device(payload: DeviceCreate) -> dict:
    data = {"location": payload.location, "status": payload.status.value}
    result = get_table(SCHEMA, TABLE).insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to register device")
    return result.data[0]


def update_device(device_id: UUID, payload: DeviceUpdate) -> dict:
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    if "status" in changes and hasattr(changes["status"], "value"):
        changes["status"] = changes["status"].value
    result = get_table(SCHEMA, TABLE).update(changes).eq("device_id", str(device_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return result.data[0]


def delete_device(device_id: UUID) -> bool:
    result = get_table(SCHEMA, TABLE).delete().eq("device_id", str(device_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return True


def record_heartbeat(device_id: UUID) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    result = get_table(SCHEMA, TABLE).update(
        {"last_heartbeat": now, "status": "active"}
    ).eq("device_id", str(device_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return result.data[0]