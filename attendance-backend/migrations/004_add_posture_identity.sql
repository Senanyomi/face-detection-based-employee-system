-- Run once in the Supabase SQL editor before starting the updated posture bridge.
alter table analytics_service.productivity
    add column if not exists identified_employee text;

alter table analytics_service.productivity
    add column if not exists worker_id text;

update analytics_service.productivity
set identified_employee = coalesce(identified_employee, 'Unknown')
where identified_employee is null;

update analytics_service.productivity
set worker_id = coalesce(worker_id, 'unknown')
where worker_id is null;
 
alter table analytics_service.productivity
    alter column identified_employee set not null;

alter table analytics_service.productivity
    alter column worker_id set not null;

grant select, insert, update on analytics_service.productivity to service_role;