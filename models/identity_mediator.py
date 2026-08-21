"""Cross-process identity handoff from face verification to posture tracking."""

import json
import os
import tempfile
import threading
import time
from typing import Optional


_STATE_PATH = os.path.join(os.path.dirname(__file__), "identity_mediator_state.json")
_LOCK = threading.Lock()
_MAX_PENDING_SECONDS = 300


def _read_state() -> dict:
    try:
        with open(_STATE_PATH, "r", encoding="utf-8") as handle:
            state = json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        state = {}
    state.setdefault("pending", [])
    state.setdefault("assignments", {})
    return state


def _write_state(state: dict) -> None:
    directory = os.path.dirname(_STATE_PATH)
    fd, temp_path = tempfile.mkstemp(prefix="identity_mediator_", suffix=".tmp", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(state, handle, ensure_ascii=False, indent=2)
        os.replace(temp_path, _STATE_PATH)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def publish_identity(employee_name: str, employee_id: str, timestamp: Optional[str] = None) -> None:
    """Queue one face-confirmed identity for the next unseen posture worker."""
    now = time.time()
    event = {
        "employee_name": employee_name,
        "employee_id": employee_id,
        "timestamp": timestamp or str(now),
        "published_epoch": now,
    }
    with _LOCK:
        state = _read_state()
        state["pending"] = [
            item for item in state["pending"]
            if now - float(item.get("published_epoch", now)) <= _MAX_PENDING_SECONDS
        ]
        assigned_employee_ids = {
            item.get("employee_id") for item in state["assignments"].values()
        }
        # Do not queue the same face result repeatedly during a verification window.
        if employee_id not in assigned_employee_ids and not any(
            item.get("employee_id") == employee_id
            and item.get("timestamp") == event["timestamp"]
            for item in state["pending"]
        ):
            state["pending"].append(event)
        _write_state(state)


def assign_next_worker(worker_id: str) -> Optional[dict]:
    """Assign the oldest pending face identity to a newly seen posture worker."""
    with _LOCK:
        state = _read_state()
        existing = state["assignments"].get(str(worker_id))
        if existing:
            return existing
        if not state["pending"]:
            return None
        identity = state["pending"].pop(0)
        state["assignments"][str(worker_id)] = identity
        _write_state(state)
        return identity


def release_worker(worker_id: str) -> None:
    """Forget a stale tracker assignment so a future worker can be assigned."""
    with _LOCK:
        state = _read_state()
        state["assignments"].pop(str(worker_id), None)
        _write_state(state)
