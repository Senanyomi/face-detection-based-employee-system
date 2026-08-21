"""Apply idempotent database migrations before the analytics service starts."""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from shared.db.client import get_table


load_dotenv(ROOT / ".env")
MIGRATIONS_DIR = ROOT / "migrations"


def main() -> int:
    database_url = os.getenv("SUPABASE_DB_URL")
    if not database_url:
        try:
            get_table("analytics_service", "productivity").select(
                "identified_employee,worker_id"
            ).limit(1).execute()
            print("Posture identity migration already applied; verified through Supabase API.")
            return 0
        except Exception as error:
            print(
                "SUPABASE_DB_URL is required to apply missing database migrations. "
                f"Current schema verification failed: {error}",
                file=sys.stderr,
            )
            return 1

    try:
        with psycopg.connect(database_url, connect_timeout=10) as connection:
            for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
                connection.execute(migration.read_text(encoding="utf-8"))
                print(f"Applied migration: {migration.name}")
        return 0
    except Exception as error:
        print(f"Migration failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
