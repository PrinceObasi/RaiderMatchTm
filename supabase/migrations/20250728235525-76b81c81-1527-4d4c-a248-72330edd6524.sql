-- Add open/close columns (nullable close)
alter table public.jobs
  add column opens_at date default current_date,
  add column closes_at date;

-- Back-fill existing rows to open now
update public.jobs set opens_at = current_date where opens_at is null;

-- (optional) simple index for the date window
create index if not exists jobs_open_close_idx
  on public.jobs (opens_at, closes_at);