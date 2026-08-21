"""
attendance_reconciler.py

Daily attendance reconciliation processor for Emprod.

Rules applied:
  1. Consecutive check-ins for the same employee on the same day
     → collapsed into ONE check-in at the timestamp of the FIRST one.

  2. Consecutive check-outs for the same employee on the same day
     → collapsed into ONE check-out at the timestamp of the FIRST one.

  3. For each employee each day, only TWO records are kept:
     → FIRST check-in of the day  (when they arrived)
     → LAST check-out of the day  (when they went home)
     All intermediate exits and re-entries (breaks, stepping out) are removed.

  4. The raw logs in attendance_service.logs are NOT deleted.
     Reconciled results are written to a NEW table:
     attendance_service.daily_summary
     This preserves the original raw data for audit purposes.

Run this script:
  - Once per day (e.g. at end of day via a scheduled task)
  - Or manually at any time to reconcile today's data
  - Or continuously with --watch mode to reconcile every N minutes

Usage:
  python processors/attendance_reconciler.py               # reconcile today
  python processors/attendance_reconciler.py --date 2026-07-22   # specific date
    python processors/attendance_reconciler.py --watch 1    # run every 1 minute
"""

import sys
import os
import argparse
import time
import logging
from datetime import datetime, timezone, date, timedelta
from collections import defaultdict

# Allow imports from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.config import get_settings
from supabase import create_client

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [RECONCILER] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Supabase client ───────────────────────────────────────────────────────────
def get_client():
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return client


# ── Step 1: Create the daily_summary table if it does not exist ───────────────
SETUP_SQL = """
CREATE TABLE IF NOT EXISTS attendance_service.daily_summary (
    summary_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES auth_service.employees(employee_id) ON DELETE CASCADE,
    summary_date    DATE NOT NULL,
    first_check_in  TIMESTAMPTZ,
    last_check_out  TIMESTAMPTZ,
    total_check_ins  INTEGER DEFAULT 0,
    total_check_outs INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_employee
    ON attendance_service.daily_summary(employee_id);

CREATE INDEX IF NOT EXISTS idx_daily_summary_date
    ON attendance_service.daily_summary(summary_date);
"""


def ensure_table_exists(client):
    """
    Creates the daily_summary table if it does not already exist.
    Run this once. After that it is safe to run on every reconciliation.
    """
    try:
        client.postgrest.schema("attendance_service")
        # Try to select from the table — if it fails the table does not exist
        client.table("daily_summary").select("summary_id").limit(1).execute()
        log.info("daily_summary table already exists")
    except Exception:
        log.info("daily_summary table not found — creating it now")
        log.info("Please run the following SQL in your Supabase SQL Editor:")
        log.info("─" * 60)
        print(SETUP_SQL)
        log.info("─" * 60)
        log.info("After running that SQL, re-run this script.")
        sys.exit(1)


# ── Step 2: Fetch raw logs for a specific date ────────────────────────────────
def fetch_raw_logs(client, target_date: date) -> list[dict]:
    """
    Fetches all raw attendance events for the given date from
    attendance_service.logs, ordered by employee and timestamp.
    """
    day_start = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
    day_end   = datetime.combine(target_date + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()

    client.postgrest.schema("attendance_service")
    result = (
        client.table("logs")
        .select("log_id, employee_id, entry_type, timestamp, recognition_confidence, device_id")
        .gte("timestamp", day_start)
        .lt("timestamp", day_end)
        .order("employee_id")
        .order("timestamp")
        .execute()
    )
    logs = result.data or []
    log.info("Fetched %d raw log entries for %s", len(logs), target_date)
    return logs


# ── Step 3: Group logs by employee ────────────────────────────────────────────
def group_by_employee(raw_logs: list[dict]) -> dict[str, list[dict]]:
    """Groups raw log entries by employee_id."""
    grouped = defaultdict(list)
    for entry in raw_logs:
        grouped[entry["employee_id"]].append(entry)
    return dict(grouped)


# ── Step 4: Apply reconciliation rules ───────────────────────────────────────
def reconcile_employee_logs(entries: list[dict]) -> dict:
    """
    Applies the three reconciliation rules to one employee's events for one day.

    Returns a dict with:
      - first_check_in:   timestamp of the very first check-in event
      - last_check_out:   timestamp of the very last check-out event
    - total_check_ins:  how many check-in runs remain after collapsing
    - total_check_outs: how many check-out runs remain after collapsing
      - collapsed_sequence: the cleaned sequence after removing consecutive duplicates
    """
    # Sort by timestamp ascending
    sorted_entries = sorted(entries, key=lambda e: e["timestamp"])

    # Count raw totals before reconciliation
    raw_check_ins  = [e for e in sorted_entries if e["entry_type"] == "check_in"]
    raw_check_outs = [e for e in sorted_entries if e["entry_type"] == "check_out"]

    # ── Rule 1 & 2: Keep only valid alternating attendance events ─────────────
    # A check-out is valid only while the employee is checked in. This both
    # collapses consecutive duplicates and ignores stray leading check-outs.
    #
    # Example input:  [IN, IN, IN, OUT, OUT, IN, OUT, OUT]
    # After collapse: [IN, OUT, IN, OUT]
    #
    collapsed = []
    is_checked_in = False
    for entry in sorted_entries:
        entry_type = entry["entry_type"]
        if entry_type == "check_in" and not is_checked_in:
            collapsed.append(entry)
            is_checked_in = True
        elif entry_type == "check_out" and is_checked_in:
            collapsed.append(entry)
            is_checked_in = False
        else:
            # Duplicate sign-in, duplicate sign-out, or an unmatched sign-out.
            log.debug(
                "Ignoring invalid or duplicate %s at %s",
                entry_type, entry["timestamp"]
            )

    # ── Rule 3: First check-in and last check-out ─────────────────────────────
    # From the collapsed sequence, the FIRST check-in is the arrival time.
    # The LAST check-out is the departure time.
    # Everything in between (break exits, re-entries) is kept in the sequence
    # but the summary record only stores first_in and last_out.

    first_check_in = None
    last_check_out = None

    all_check_ins  = [e for e in collapsed if e["entry_type"] == "check_in"]
    all_check_outs = [e for e in collapsed if e["entry_type"] == "check_out"]

    if all_check_ins:
        first_check_in = all_check_ins[0]["timestamp"]

    if all_check_outs:
        # Last check-out: the final exit of the day
        last_check_out = all_check_outs[-1]["timestamp"]

    total_check_ins = len(all_check_ins)
    total_check_outs = len(all_check_outs)

    return {
        "first_check_in":   first_check_in,
        "last_check_out":   last_check_out,
        "total_check_ins":  total_check_ins,
        "total_check_outs": total_check_outs,
        "collapsed_events": len(collapsed),
        "original_events":  len(sorted_entries),
    }


# ── Step 5: Write reconciled results to daily_summary ────────────────────────
def write_summary(client, employee_id: str, target_date: date, result: dict):
    """
    Upserts a reconciled daily summary record for one employee on one date.
    Uses UPSERT so re-running the reconciler on the same date is safe —
    it will update the existing record rather than creating a duplicate.
    """
    payload = {
        "employee_id":     employee_id,
        "summary_date":    target_date.isoformat(),
        "first_check_in":  result["first_check_in"],
        "last_check_out":  result["last_check_out"],
        "total_check_ins": result["total_check_ins"],
        "total_check_outs":result["total_check_outs"],
        "updated_at":      datetime.now(timezone.utc).isoformat(),
    }

    client.postgrest.schema("attendance_service")
    client.table("daily_summary").upsert(
        payload,
        on_conflict="employee_id,summary_date"
    ).execute()


# ── Step 6: Main reconciliation runner ───────────────────────────────────────
def reconcile(target_date: date):
    """
    Full reconciliation pipeline for one day.
    Fetches raw logs → groups by employee → applies rules → writes summaries.
    """
    log.info("=" * 55)
    log.info("Reconciling attendance for: %s", target_date)
    log.info("=" * 55)

    client = get_client()
    ensure_table_exists(client)

    raw_logs = fetch_raw_logs(client, target_date)

    if not raw_logs:
        log.info("No raw logs found for %s — nothing to reconcile", target_date)
        return

    grouped = group_by_employee(raw_logs)
    log.info("Processing %d unique employees", len(grouped))

    processed = 0
    for employee_id, entries in grouped.items():
        result = reconcile_employee_logs(entries)

        log.info(
            "Employee %s... | raw: %d events → collapsed: %d | "
            "first_in: %s | last_out: %s",
            employee_id[:8],
            result["original_events"],
            result["collapsed_events"],
            result["first_check_in"],
            result["last_check_out"],
        )

        write_summary(client, employee_id, target_date, result)
        processed += 1

    log.info("─" * 55)
    log.info("Reconciliation complete — %d employee summaries written", processed)
    log.info("Results stored in attendance_service.daily_summary")


# ── CLI entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Emprod attendance reconciler")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Date to reconcile in YYYY-MM-DD format. Defaults to today.",
    )
    parser.add_argument(
        "--watch",
        type=int,
        default=None,
        metavar="MINUTES",
        help="Run continuously, reconciling every N minutes.",
    )
    args = parser.parse_args()

    if args.date:
        target = date.fromisoformat(args.date)
    else:
        target = date.today()

    if args.watch:
        log.info("Watch mode: reconciling every %d minutes", args.watch)
        while True:
            reconcile(date.today())
            log.info("Next run in %d minutes...", args.watch)
            time.sleep(args.watch * 60)
    else:
        reconcile(target)