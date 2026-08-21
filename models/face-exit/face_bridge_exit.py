"""
face_bridge_exit.py

Reads finalized face-verification results from face_ver_exit.py (via
prediction_store_exit's shared-memory Anyomi store) and sends a "check_out"
attendance event to the Emprod attendance_service for each newly finalized
verification window.

Run alongside `face_ver_exit.py` in a separate process:
    python face_ver_exit.py       # writer: camera loop, publishes to shared memory
    python face_bridge_exit.py    # this script: reads shared memory, POSTs to backend

Uses name_employee_map.json (created by bootstrap_face_bridge.py) to map the
model's raw labels ("Sena"/"Edward") to real employee UUIDs, and bridge_config.json
for the target attendance_service URL and this camera's registered device_id.

Uses the `_exit`-suffixed shared-memory segments (see prediction_store_exit.py)
so this never collides with the entrance pipeline running concurrently.
"""

import json
import logging
import time

import requests

import prediction_store_exit as prediction_store

# ── Configuration ────────────────────────────────────────────────────────────
POLL_INTERVAL = 3
ENTRY_TYPE = "check_out"

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [FACE-BRIDGE-EXIT] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def load_json(path: str) -> dict:
    try:
        with open(path, "r") as f:
            data = json.load(f)
            log.info("Loaded %s: %d entries", path, len(data))
            return data
    except FileNotFoundError:
        log.error("%s not found — run bootstrap_face_bridge.py first", path)
        return {}
    except json.JSONDecodeError:
        log.error("%s has invalid JSON — check its contents", path)
        return {}


def send_attendance(attendance_url: str, employee_id: str, device_id: str, confidence):
    payload = {
        "employee_id": employee_id,
        "entry_type": ENTRY_TYPE,
        "recognition_confidence": confidence,
        "device_id": device_id,
    }
    try:
        res = requests.post(
            f"{attendance_url}/api/v1/attendance/",
            json=payload,
            timeout=5,
        )
        if res.status_code == 200:
            log.info("✓ Attendance %s → %s", ENTRY_TYPE, employee_id[:8])
        else:
            log.warning("✗ Attendance %d: %s", res.status_code, res.text[:200])
    except requests.exceptions.ConnectionError:
        log.error("✗ Cannot reach attendance_service at %s", attendance_url)


def run():
    log.info("Face Bridge (exit) starting…")

    name_map = load_json("name_employee_map.json")
    config = load_json("bridge_config.json")

    if not name_map:
        log.error("No name→employee mappings found. Run bootstrap_face_bridge.py and restart.")
        return
    if not config.get("device_id"):
        log.error("bridge_config.json missing device_id. Run bootstrap_face_bridge.py and restart.")
        return

    attendance_url = config.get("attendance_url", "http://localhost:8002")
    device_id = config["device_id"]

    log.info("Polling every %ds | attendance_service=%s | device_id=%s",
             POLL_INTERVAL, attendance_url, device_id[:8])

    last_timestamp = None
    initialized = False

    while True:
        try:
            final = prediction_store.Anyomi.read()

            if final is not None:
                timestamp = final.get("avg_timestamp")
                if not initialized:
                    last_timestamp = timestamp
                    initialized = True
                    continue
                if timestamp == last_timestamp:
                    continue
                last_timestamp = timestamp

                label = final.get("label")
                confidence = final.get("avg_score")
                employee_id = name_map.get(label)

                if not employee_id:
                    log.warning("No employee mapped for label %r — add to name_employee_map.json", label)
                else:
                    score_str = f"{confidence:.4f}" if confidence is not None else "n/a"
                    log.info("New verification window: %s (score %s)", label, score_str)
                    send_attendance(attendance_url, employee_id, device_id, confidence)

        except Exception as e:
            log.error("Bridge error: %s", str(e))

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
