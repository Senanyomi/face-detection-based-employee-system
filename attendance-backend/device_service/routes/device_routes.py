from uuid import UUID
from fastapi import APIRouter, Depends
from shared.middleware import require_auth
from device_service.models.device import DeviceCreate, DeviceUpdate
from device_service.controllers import device_controller

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("/heartbeat/{device_id}", summary="Record device heartbeat")
async def heartbeat(device_id: UUID):
    """Called by edge devices every N seconds to signal they are online."""
    return device_controller.heartbeat(device_id)


@router.get("/", summary="List all devices", dependencies=[Depends(require_auth)])
async def list_devices():
    return device_controller.list_devices()


@router.post("/", summary="Register a new device", dependencies=[Depends(require_auth)])
async def register_device(payload: DeviceCreate):
    return device_controller.register_device(payload)


@router.get("/{device_id}", summary="Get device by ID", dependencies=[Depends(require_auth)])
async def get_device(device_id: UUID):
    return device_controller.get_device(device_id)


@router.patch("/{device_id}", summary="Update device details", dependencies=[Depends(require_auth)])
async def update_device(device_id: UUID, payload: DeviceUpdate):
    return device_controller.edit_device(device_id, payload)


@router.delete("/{device_id}", summary="Delete a device", dependencies=[Depends(require_auth)])
async def delete_device(device_id: UUID):
    return device_controller.remove_device(device_id)
