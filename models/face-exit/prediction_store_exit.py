"""prediction_store_exit: simple shared-memory store for realtime predictions (exit pipeline).

Usage (writer - `face_ver_exit.py`):
    import prediction_store_exit as store
    store.write(label, score)
    store.write_final(label, avg_timestamp, avg_score)

Usage (reader - other backend):
    import prediction_store_exit as store
    pred = store.read()  # returns dict {'label':..., 'score':...} or None
    from prediction_store_exit import Anyomi
    final = Anyomi.read()  # returns dict {'label':..., 'avg_timestamp':..., 'avg_score':...} or None

This uses multiprocessing.shared_memory and stores JSON strings in fixed-size buffers.
Segment names are suffixed `_exit` so this never collides with the entrance pipeline's
`prediction_store.py`, which uses the same shape but unsuffixed segment names.
"""
import csv
import json
import os
from multiprocessing import shared_memory

# Shared memory config
_NAME = 'face_pred_shm_exit'
_SIZE = 4096
_ANYOMI_NAME = 'face_anyomi_shm_exit'
_ANYOMI_SIZE = 4096
_shm = None
_anyomi_shm = None


def _ensure():
    global _shm
    if _shm is None:
        try:
            _shm = shared_memory.SharedMemory(name=_NAME, create=True, size=_SIZE)
            # zero-init
            _shm.buf[:] = b'\x00' * _SIZE
        except FileExistsError:
            _shm = shared_memory.SharedMemory(name=_NAME, create=False)


def _ensure_anyomi():
    global _anyomi_shm
    if _anyomi_shm is None:
        try:
            _anyomi_shm = shared_memory.SharedMemory(name=_ANYOMI_NAME, create=True, size=_ANYOMI_SIZE)
            _anyomi_shm.buf[:] = b'\x00' * _ANYOMI_SIZE
        except FileExistsError:
            _anyomi_shm = shared_memory.SharedMemory(name=_ANYOMI_NAME, create=False)


def write(label, score):
    """Write a prediction into shared memory (overwrites previous)."""
    _ensure()
    payload = json.dumps({'label': label, 'score': float(score)})
    data = payload.encode('utf-8')
    if len(data) >= _SIZE:
        raise ValueError('Prediction JSON too large for shared memory')
    # write data and null-terminate
    _shm.buf[:len(data)] = data
    _shm.buf[len(data)] = 0


def write_final(label, avg_timestamp, avg_score=None):
    """Write the final verified result, its average timestamp, and confidence to shared memory."""
    _ensure_anyomi()
    payload = json.dumps({'label': label, 'avg_timestamp': str(avg_timestamp), 'avg_score': avg_score})
    data = payload.encode('utf-8')
    if len(data) >= _ANYOMI_SIZE:
        raise ValueError('Anyomi JSON too large for shared memory')
    _anyomi_shm.buf[:len(data)] = data
    _anyomi_shm.buf[len(data)] = 0


def write_final_result_summary(label, avg_timestamp, avg_score, output_path='final_result.txt', instance_id=None):
    """Persist a concise text summary of the latest verified result."""
    directory = os.path.dirname(output_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    instance_prefix = f"INSTANCE {instance_id}: " if instance_id is not None else ""
    summary = (
        f"{instance_prefix}FINAL RESULT: {label}\n"
        f"AVG SCORE: {avg_score:.4f}\n"
        f"AVG TIMESTAMP: {str(avg_timestamp)}\n"
    )
    with open(output_path, 'w', encoding='utf-8') as handle:
        handle.write(summary)


def append_verification_result(label, avg_timestamp, avg_score, output_path='verification_results.csv'):
    """Append one verification-window result as a separate detection instance."""
    directory = os.path.dirname(output_path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    file_exists = os.path.exists(output_path) and os.path.getsize(output_path) > 0
    if not file_exists:
        instance_id = 1
    else:
        with open(output_path, 'r', encoding='utf-8', newline='') as handle:
            rows = list(csv.reader(handle))
        instance_id = len(rows) if len(rows) == 0 else len(rows)
        if rows and rows[0] == ['instance_id', 'label', 'avg_score', 'avg_timestamp']:
            instance_id = len(rows)
        else:
            instance_id = len(rows) + 1
    with open(output_path, 'a', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle)
        if not file_exists:
            writer.writerow(['instance_id', 'label', 'avg_score', 'avg_timestamp'])
        writer.writerow([instance_id, label, f"{avg_score:.6f}", str(avg_timestamp)])
    return instance_id


def read():
    """Read the latest prediction from shared memory. Returns dict or None."""
    _ensure()
    buf = _shm.buf.tobytes()
    if buf[0] == 0:
        return None
    # find null terminator
    try:
        end = buf.index(0)
    except ValueError:
        end = _SIZE
    raw = buf[:end].decode('utf-8')
    try:
        return json.loads(raw)
    except Exception:
        return None


def read_anyomi():
    """Read the latest final result from shared memory. Returns dict or None."""
    _ensure_anyomi()
    buf = _anyomi_shm.buf.tobytes()
    if buf[0] == 0:
        return None
    try:
        end = buf.index(0)
    except ValueError:
        end = _ANYOMI_SIZE
    raw = buf[:end].decode('utf-8')
    try:
        return json.loads(raw)
    except Exception:
        return None


def close():
    """Close the shared memory handle (writer or reader can call this)."""
    global _shm, _anyomi_shm
    if _shm is not None:
        _shm.close()
        _shm = None
    if _anyomi_shm is not None:
        _anyomi_shm.close()
        _anyomi_shm = None


def close_anyomi():
    """Close only the Anyomi shared memory handle."""
    global _anyomi_shm
    if _anyomi_shm is not None:
        _anyomi_shm.close()
        _anyomi_shm = None


def unlink():
    """Unlink (destroy) the shared memory block. Only call when you want to remove it."""
    global _shm
    if _shm is not None:
        try:
            _shm.unlink()
        except FileNotFoundError:
            pass
        _shm = None


def unlink_anyomi():
    """Unlink (destroy) the Anyomi shared memory block."""
    global _anyomi_shm
    if _anyomi_shm is not None:
        try:
            _anyomi_shm.unlink()
        except FileNotFoundError:
            pass
        _anyomi_shm = None


class AnyomiProxy:
    """Realtime proxy for the Anyomi final-result shared store."""

    @property
    def value(self):
        return read_anyomi()

    def read(self):
        return self.value

    def __repr__(self):
        return f"<Anyomi value={self.value!r}>"


Anyomi = AnyomiProxy()
