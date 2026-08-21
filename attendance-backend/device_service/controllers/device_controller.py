from uuid import UUID
from shared.utils.responses import success_response
from device_service.models.device import DeviceCreate, DeviceUpdate
from device_service.services import device_service


def list_devices():
    return success_response("Devices retrieved", device_service.get_all_devices())


def get_device(device_id: UUID):
    return success_response("Device retrieved", device_service.get_device_by_id(device_id))


def register_device(payload: DeviceCreate):
    return success_response("Device registered", device_service.create_device(payload))


def edit_device(device_id: UUID, payload: DeviceUpdate):
    return success_response("Device updated", device_service.update_device(device_id, payload))


def remove_device(device_id: UUID):
    device_service.delete_device(device_id)
    return success_response("Device deleted")


def heartbeat(device_id: UUID):
    return success_response("Heartbeat recorded", device_service.record_heartbeat(device_id))
