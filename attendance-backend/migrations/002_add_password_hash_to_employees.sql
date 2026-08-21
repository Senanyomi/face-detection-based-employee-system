-- Migration: Add password_hash column to employees table for HR Admin authentication
-- Run this in Supabase SQL editor

-- Add password_hash column to store bcrypt-hashed passwords
alter table auth_service.employees
add column if not exists password_hash text;

-- Add index for faster login lookups (optional but recommended)
create index if not exists idx_employees_password_lookup
on auth_service.employees (employee_id) where password_hash is not null;

-- Grant permissions to service_role (required for PostgREST/Supabase client)
grant select, insert, update on auth_service.employees to service_role;

-- Note: Existing employees will have NULL password_hash and cannot log in via password
-- until they are updated with a password. Use the bootstrap script or admin panel to set passwords.