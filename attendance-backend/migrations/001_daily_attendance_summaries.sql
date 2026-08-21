-- Run this once in the Supabase SQL editor before deploying the daily
-- attendance duration feature. Not applied automatically — this repo has no
-- migration runner (see README: schema is created out-of-band in Supabase).
--
-- Stores one row per employee per calendar day: the total worked duration
-- for that day (sum of every completed check_in -> check_out interval,
-- so stepping out for lunch and coming back is handled correctly), plus
-- that day's first check-in and last check-out. Recomputed from scratch by
-- attendance_service every time a check_out is logged for that day.

create table if not exists attendance_service.daily_summaries (
    summary_id uuid primary key default gen_random_uuid(),
    employee_id uuid not null,
    work_date date not null,
    total_duration_seconds integer not null default 0,
    first_check_in timestamptz,
    last_check_out timestamptz,
    updated_at timestamptz not null default now(),
    unique (employee_id, work_date)
);

-- Every other table here was already granted to service_role when the
-- schema was first set up; a brand-new table doesn't inherit that
-- automatically, so it has to be granted explicitly or PostgREST (used by
-- the Python supabase client) gets "permission denied for table
-- daily_summaries" (error 42501) on every insert/select/update.
grant select, insert, update on attendance_service.daily_summaries to service_role;
