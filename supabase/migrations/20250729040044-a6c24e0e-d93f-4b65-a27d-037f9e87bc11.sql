-- Add is_active column to jobs table
alter table public.jobs
  add column if not exists is_active boolean default true;