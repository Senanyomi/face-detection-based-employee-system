"""
sena_bridge.py

Reads posture detection output and sends it to the Emprod backend
microservices. Uses worker_map.json to link detected workers to specific
employees.

IMPORTANT: this runs as its own OS process (`python sena_bridge.py`),
separate from the ai_engine.py / sena_logger.py process that actually reads
the camera. Because of that, it CANNOT use sena_status.get_sena_status()
directly — that only returns an in-process copy of the `Sena` dict, which is
empty in this process and never updated by the other one (plain Python
module state does not cross OS process boundaries). The real cross-process
channel is sena_logger.py's snapshot loop, which deep-copies
ai_engine.LIVE_OUTPUT_STREAM into sena_dump.json (as "latest_status") every
60 seconds. This bridge reads that file instead.

Run it alongside `python sena_logger.py` (which imports and starts
ai_engine.py's camera thread):
    python sena_logger.py    # writer: camera loop + 60s snapshot to sena_dump.json
    python sena_bridge.py    # this script: reads sena_dump.json, POSTs to backend
"""

import time
import requests
import json
import logging
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from identity_mediator import assign_next_worker, release_worker

# ── Configuration ─────────────────────────────────────────────────────────────
ANALYTICS_URL  = "http://localhost:8003"
AUDIT_URL      = "http://localhost:8005"
ATTENDANCE_URL = "http://localhost:8002"
DEVICE_URL     = "http://localhost:8004"

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DUMP_PATH = os.path.join(_SCRIPT_DIR, "sena_dump.json")
WORKER_MAP_PATH = os.path.join(_SCRIPT_DIR, "worker_map.json")

POLL_INTERVAL = 10

# sena_logger.py's snapshot loop (not part of this file) only writes a fresh
# sena_dump.json every 60s — a snapshot we process therefore represents ~60s
# of real observation, regardless of how often we poll for a new one.
SNAPSHOT_INTERVAL_SECONDS = 60

DEVICE_ID = "b7655bde-b07d-4a48-a73a-9593c681d5e2"  # "Main office" device_service record

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BRIDGE] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Load worker → employee mapping ────────────────────────────────────────────
def load_worker_map() -> dict:
    """
    Reads worker_map.json which links worker positions to employee UUIDs.
    Example content:
    {
        "worker_1": "uuid-of-employee-1",
        "worker_2": "uuid-of-employee-2"
    }
    """
    try:
        with open(WORKER_MAP_PATH, "r") as f:
            mapping = json.load(f)
            log.info("Worker map loaded: %d employees mapped", len(mapping))
            return mapping
    except FileNotFoundError:
        log.error("worker_map.json not found — create it in the same folder as sena_bridge.py")
        return {}
    except json.JSONDecodeError:
        log.error("worker_map.json has invalid JSON — check its contents")
        return {}


# ── Posture state mapping ─────────────────────────────────────────────────────
def map_posture_state(raw: str) -> str:
    """Maps detection system values to backend accepted values.

    ai_engine.py's per-worker "status" field is literally "WORKING" or
    "NOT-WORKING" (see ai_engine.py's frame_workers_state assignment) — matched
    here case-insensitively alongside the other synonyms this bridge was
    originally written to expect, in case that ever changes upstream.
    """
    mapping = {
        "working":     "focused",
        "not-working": "distracted",
        "active":      "focused",
        "focused":     "focused",
        "idle":        "distracted",
        "distracted":  "distracted",
        "absent":      "away",
        "away":        "away",
        "unknown":     "unknown",
    }
    return mapping.get(str(raw).lower(), "unknown")


def engagement_score_for(worker_data: dict) -> float:
    """Deterministic engagement proxy derived from the geometric signals
    ai_engine.py actually produces per worker (status, is_facing_screen).
    There is no ML confidence score anywhere in this pipeline — posture
    detection is a rule-based heuristic, not a scored classifier — so this
    is an explicit 1.0 / 0.5 / 0.0 scale rather than a fabricated number."""
    if str(worker_data.get("status", "")).upper() == "WORKING":
        return 1.0
    if worker_data.get("is_facing_screen"):
        return 0.5
    return 0.0


# ── Cross-process status read ─────────────────────────────────────────────────
def read_latest_status() -> dict:
    """Reads the most recent posture-detection snapshot written by
    sena_logger.py's snapshot loop. Returns the "latest_status" payload
    (shape: {working_status, timestamp, active_workers_count, workers, ...})
    or {} if the dump doesn't exist yet / hasn't been written by the other
    process yet.
    """
    try:
        with open(DUMP_PATH, "r", encoding="utf-8") as f:
            dump = json.load(f)
        return dump.get("latest_status", {}) or {}
    except FileNotFoundError:
        log.warning("%s not found yet — is sena_logger.py (with ai_engine.py) running?", DUMP_PATH)
        return {}
    except json.JSONDecodeError:
        # sena_logger.py writes atomically (tmp file + os.replace), but a read
        # racing an in-progress write is still possible — just skip this poll.
        log.warning("%s could not be parsed this poll (mid-write?) — skipping", DUMP_PATH)
        return {}


# ── Bounded worker-slot assignment ────────────────────────────────────────────
# ai_engine.py's raw tracker ids are ints that increase monotonically for the
# life of the process and are never reused (confirmed against a real
# sena_dump.json snapshot containing an id of 112) — so they can't be mapped
# to worker_map.json's fixed "worker_1".."worker_N" slots by simple
# arithmetic. Instead we track our own bounded pool of N slots here and
# recycle a slot once its raw tracker id stops appearing in the feed.
_slot_by_raw_id: dict = {}
_slot_last_seen: dict = {}
SLOT_STALE_SECONDS = 30


def assign_worker_slots(raw_ids, num_slots: int, now: float) -> dict:
    """Returns {raw_id: 'worker_N'} for the given raw_ids, reusing each raw
    id's previous slot where possible and recycling slots whose raw id has
    gone quiet for SLOT_STALE_SECONDS."""
    for raw_id in raw_ids:
        _slot_last_seen[raw_id] = now

    stale_ids = [rid for rid, ts in _slot_last_seen.items() if now - ts > SLOT_STALE_SECONDS]
    for rid in stale_ids:
        _slot_last_seen.pop(rid, None)
        _slot_by_raw_id.pop(rid, None)

    used_slots = set(_slot_by_raw_id.values())
    for raw_id in raw_ids:
        if raw_id in _slot_by_raw_id:
            continue
        if isinstance(raw_id, str) and raw_id.startswith("worker_"):
            _slot_by_raw_id[raw_id] = raw_id
            used_slots.add(raw_id)
            continue
        for n in range(1, num_slots + 1):
            slot = f"worker_{n}"
            if slot not in used_slots:
                _slot_by_raw_id[raw_id] = slot
                used_slots.add(slot)
                break
        else:
            log.warning("No free worker slot for raw id %r — more people in frame "
                        "than worker_map.json has entries for", raw_id)

    return {raw_id: _slot_by_raw_id[raw_id] for raw_id in raw_ids if raw_id in _slot_by_raw_id}


# ── API calls ─────────────────────────────────────────────────────────────────
# Note: none of the endpoints this bridge calls (attendance/analytics/audit
# POST, device heartbeat) require auth on the backend, so no Authorization
# header is sent.
def send_productivity(employee_id: str, posture_state: str,
                      employee_name: str, worker_key: str,
                      engagement_score: float, duration_seconds: int):
    payload = {
        "employee_id":      employee_id,
        "identified_employee": employee_name,
        "worker_id":         worker_key,
        "posture_state":    posture_state,
        "engagement_score": round(min(max(engagement_score, 0.0), 1.0), 4),
        "duration_seconds": duration_seconds,
    }
    try:
        res = requests.post(
            f"{ANALYTICS_URL}/api/v1/analytics/",
            json=payload,
            timeout=5,
        )
        if res.status_code == 200:
            log.info("✓ Productivity → %s | %s | score %.2f",
                     employee_id[:8], posture_state, engagement_score)
        else:
            log.warning("✗ Analytics %d: %s", res.status_code, res.text[:100])
    except requests.exceptions.ConnectionError:
        log.error("✗ Cannot reach analytics_service on port 8003")


def send_audit(action: str, employee_id: str, metadata: dict):
    payload = {
        "action":       action,
        "performed_by": employee_id,
        "metadata":     metadata,
    }
    try:
        requests.post(
            f"{AUDIT_URL}/api/v1/audit/",
            json=payload,
            timeout=5,
        )
    except requests.exceptions.ConnectionError:
        log.error("✗ Cannot reach audit_service on port 8005")


def send_attendance(employee_id: str, entry_type: str):
    payload = {
        "employee_id":            employee_id,
        "entry_type":             entry_type,
        # Posture detection identifies a person by tracked position, not by a
        # scored recognition model — there is no real confidence value to
        # report here, so this is left null rather than a fabricated number.
        "recognition_confidence": None,
        "device_id":              DEVICE_ID,
    }
    try:
        res = requests.post(
            f"{ATTENDANCE_URL}/api/v1/attendance/",
            json=payload,
            timeout=5,
        )
        if res.status_code == 200:
            log.info("✓ Attendance %s → %s", entry_type, employee_id[:8])
    except requests.exceptions.ConnectionError:
        log.error("✗ Cannot reach attendance_service on port 8002")


def send_heartbeat():
    """Marks the Main office device as alive. device_service never expires a
    device's status on its own, so this is what lets the frontend Devices page
    show a real, moving last_heartbeat for the machine running pose detection."""
    try:
        res = requests.post(
            f"{DEVICE_URL}/api/v1/devices/heartbeat/{DEVICE_ID}",
            timeout=5,
        )
        if res.status_code == 200:
            log.info("✓ Heartbeat → device %s", DEVICE_ID[:8])
        else:
            log.warning("✗ Heartbeat %d: %s", res.status_code, res.text[:200])
    except requests.exceptions.ConnectionError:
        log.error("✗ Cannot reach device_service on port 8004")


# ── Main loop ─────────────────────────────────────────────────────────────────
def run():
    log.info("Sena Bridge starting…")

    # Load the worker → employee mapping once at startup
    worker_map = load_worker_map()

    if not worker_map:
        log.error("No worker mappings found. Add entries to worker_map.json and restart.")
        return

    log.info("Polling every %ds | dump=%s | Services: analytics=%s audit=%s attendance=%s device=%s",
             POLL_INTERVAL, DUMP_PATH, ANALYTICS_URL, AUDIT_URL, ATTENDANCE_URL, DEVICE_URL)

    checked_in = set()
    last_seen_timestamp = None
    active_raw_ids = set()

    while True:
        try:
            # Device heartbeat runs every poll regardless of whether anyone is
            # in frame or whether a fresh snapshot exists — it reflects "the
            # bridge + Main office device are alive", not "someone is
            # currently being observed".
            send_heartbeat()

            status = read_latest_status()
            snapshot_timestamp = status.get("timestamp")

            # sena_logger.py only snapshots every ~60s, but we poll every
            # POLL_INTERVAL (10s) — skip re-processing the same snapshot so we
            # don't send 5-6x duplicate productivity/audit records per minute.
            if not status or snapshot_timestamp == last_seen_timestamp:
                log.info("No new snapshot since last poll (last: %s)", last_seen_timestamp)
                time.sleep(POLL_INTERVAL)
                continue
            last_seen_timestamp = snapshot_timestamp

            workers      = status.get("workers", {})
            global_state = status.get("working_status", "UNKNOWN")
            active_count = status.get("active_workers_count", 0)

            log.info("New snapshot @ %s — global: %s | active workers: %d",
                     snapshot_timestamp, global_state, active_count)

            if not workers:
                log.info("No workers detected in frame")
                for stale_raw_id in active_raw_ids:
                    release_worker(str(stale_raw_id))
                active_raw_ids.clear()
            else:
                current_raw_ids = set(workers.keys())
                for stale_raw_id in active_raw_ids - current_raw_ids:
                    release_worker(str(stale_raw_id))
                active_raw_ids = current_raw_ids
                # ai_engine.py's raw keys are integer tracker ids that grow
                # unboundedly over a session; map them onto worker_map.json's
                # bounded "worker_N" slots.
                slot_map = assign_worker_slots(list(workers.keys()), num_slots=len(worker_map), now=time.time())

                for raw_key, worker_data in workers.items():
                    worker_key = slot_map.get(raw_key)

                    if not worker_key:
                        continue  # no free slot this round (already logged in assign_worker_slots)

                    identity = assign_next_worker(str(raw_key))
                    if not identity:
                        log.warning("No face identity available for posture worker %s; skipping record", raw_key)
                        continue
                    employee_name = identity["employee_name"]
                    employee_id = identity["employee_id"]

                    # ai_engine.py's per-worker dict only ever has "status"
                    # ("WORKING"/"NOT-WORKING") — confirmed directly against
                    # ai_engine.py's frame_workers_state assignment.
                    posture_raw = worker_data.get("status", "UNKNOWN")
                    posture_state = map_posture_state(posture_raw)

                    # Real, derived signals — not fabricated placeholders.
                    confidence = engagement_score_for(worker_data)
                    duration = SNAPSHOT_INTERVAL_SECONDS

                    log.info("Worker %s → employee %s | posture: %s",
                             worker_key, employee_id[:8], posture_state)

                    # Send productivity record
                    send_productivity(employee_id, posture_state, employee_name,
                                      worker_key, confidence, duration)

                    # Send attendance check-in once per session
                    if employee_id not in checked_in:
                        if posture_state != "away":
                            send_attendance(employee_id, "check_in")
                            checked_in.add(employee_id)

                    # Audit important posture events
                    if posture_state in ("focused", "distracted"):
                        send_audit(
                            action=f"POSTURE_{posture_state.upper()}",
                            employee_id=employee_id,
                            metadata={
                                "worker_key":       worker_key,
                                "identified_employee": employee_name,
                                "posture_state":    posture_state,
                                "engagement_score": confidence,
                                "duration_seconds": duration,
                                "timestamp":        datetime.now(timezone.utc).isoformat(),
                            }
                        )

        except Exception as e:
            log.error("Bridge error: %s", str(e))

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()