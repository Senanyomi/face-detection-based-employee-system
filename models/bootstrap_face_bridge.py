"""
bootstrap_face_bridge.py

One-time setup script that creates the real attendance-backend records the
face-recognition bridges (`face-entance/face_bridge.py`, `face-exit/face_bridge_exit.py`)
need to POST real attendance events:

  1. Employee records for "Sena" and "Edward" (the two labels the current
     face_ver.py classifier can produce) -> name_employee_map.json
  2. A bootstrap admin employee + JWT (needed only to register devices, since
     POST /api/v1/devices/ requires auth) -> not persisted, used in-memory
  3. Two devices, "Entrance Camera" and "Exit Camera" -> bridge_config.json

Idempotent: if the output files already exist, this script leaves them alone
and does nothing for that step. Pass --force to overwrite and re-create
everything from scratch (this WILL create new duplicate employee/device rows
in the backend — the old ones are not deleted).

Requires attendance-backend's auth_service (8001) and device_service (8004)
to be reachable, e.g. `docker-compose up` from attendance-backend/.
"""

import argparse
import json
import logging
from pathlib import Path

import requests

BASE_DIR = Path(__file__).resolve().parent
ENTRANCE_DIR = BASE_DIR / "face-entance"
EXIT_DIR = BASE_DIR / "face-exit"

AUTH_URL = "http://localhost:8001"
DEVICE_URL = "http://localhost:8004"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BOOTSTRAP] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def unwrap(response_json: dict) -> dict:
    """Backend responses are wrapped as {"success", "message", "data"} — unwrap if so."""
    return response_json.get("data", response_json)


def create_employee(full_name: str, role: str, department: str = None) -> str:
    payload = {
        "full_name": full_name,
        "role": role,
        "department": department,
        "consent_status": True,
    }
    res = requests.post(f"{AUTH_URL}/api/v1/employees/", json=payload, timeout=10)
    res.raise_for_status()
    employee = unwrap(res.json())
    log.info("Created employee %s (%s) -> %s", full_name, role, employee["employee_id"])
    return employee["employee_id"]


def issue_token(employee_id: str) -> str:
    res = requests.post(f"{AUTH_URL}/api/v1/employees/{employee_id}/token", timeout=10)
    res.raise_for_status()
    token = unwrap(res.json())
    return token["access_token"]


def create_device(location: str, token: str) -> str:
    payload = {"location": location, "status": "active"}
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{DEVICE_URL}/api/v1/devices/", json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    device = unwrap(res.json())
    log.info("Created device %s -> %s", location, device["device_id"])
    return device["device_id"]


def write_json(path: Path, data: dict):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    log.info("Wrote %s", path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                         help="Re-create employees/devices and overwrite config files even if they already exist")
    args = parser.parse_args()

    name_map_targets = [ENTRANCE_DIR / "name_employee_map.json", EXIT_DIR / "name_employee_map.json"]
    config_targets = {
        ENTRANCE_DIR / "bridge_config.json": "Entrance Camera",
        EXIT_DIR / "bridge_config.json": "Exit Camera",
    }

    # ── Employees ────────────────────────────────────────────────────────────
    if not args.force and all(p.exists() for p in name_map_targets):
        log.info("name_employee_map.json already exists in both dirs — skipping employee creation "
                 "(use --force to re-create)")
    else:
        sena_id = create_employee("Sena", role="Employee", department="Operations")
        edward_id = create_employee("Edward", role="Employee", department="Operations")
        name_map = {"Sena": sena_id, "Edward": edward_id}
        for target in name_map_targets:
            write_json(target, name_map)

    # ── Devices (needs an admin token first) ────────────────────────────────
    if not args.force and all(p.exists() for p in config_targets):
        log.info("bridge_config.json already exists in both dirs — skipping device creation "
                 "(use --force to re-create)")
    else:
        admin_id = create_employee("Face Bridge Bootstrap Admin", role="HR Admin", department="HR")
        admin_token = issue_token(admin_id)

        for config_path, device_location in config_targets.items():
            device_id = create_device(device_location, admin_token)
            write_json(config_path, {
                "device_id": device_id,
                "attendance_url": "http://localhost:8002",
            })

    log.info("Bootstrap complete. You can now run face_bridge.py / face_bridge_exit.py.")


if __name__ == "__main__":
    main()