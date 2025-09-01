create extension if not exists pgcrypto;
create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_title text default 'Software Engineering Intern',
  category text,
  location text,
  is_texas boolean default false,
  sponsorship_flag text default 'unknown' check (sponsorship_flag in ('unknown','cpt_opt_ok','no')),
  employment_type text default 'internship',
  apply_url text,
  source_url text,
  date_posted date,
  deadline date,
  remote_flag boolean,
  notes text,
  last_checked_utc timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists internships_uniq on public.internships (company, role_title, coalesce(location,''), coalesce(date_posted,'1900-01-01'));
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists set_updated_at_internships on public.internships;
create trigger set_updated_at_internships before update on public.internships
  for each row execute function public.set_updated_at();