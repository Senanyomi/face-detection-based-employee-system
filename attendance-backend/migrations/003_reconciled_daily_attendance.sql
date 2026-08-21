-- Run this once in the Supabase SQL editor.
-- Raw attendance_service.logs remain unchanged for audit purposes.

create table if not exists attendance_service.daily_summary (
    summary_id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references auth_service.employees(employee_id) on delete cascade,
    summary_date date not null,
    first_check_in timestamptz,
    last_check_out timestamptz,
    total_check_ins integer not null default 0,
    total_check_outs integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (employee_id, summary_date)
);

create index if not exists idx_daily_summary_employee
    on attendance_service.daily_summary(employee_id);

create index if not exists idx_daily_summary_date
    on attendance_service.daily_summary(summary_date);

grant select, insert, update on attendance_service.daily_summary to service_role;