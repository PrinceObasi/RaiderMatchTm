-- 1) Make sure jobs has id & timestamps (safe if already exist)
create extension if not exists pgcrypto;
alter table public.jobs
  add column if not exists id uuid primary key default gen_random_uuid(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- keep a basic trigger to maintain updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- 2) Adapter view: normalize CSV columns into the app shape
--   title, company, city, description, skills[], application_url, is_active, type, opens_at, closes_at
create or replace view public.jobs_for_app as
with parsed as (
  select
    j.id,
    j.company,
    j.role_title as title,
    /* city = text before first comma (if any) */
    nullif(btrim(split_part(coalesce(j.location,''), ',', 1)), '') as city,
    /* concise description using role+stack (keeps it simple) */
    concat_ws(' ',
      coalesce(j.company,''),
      'is hiring a',
      coalesce(j.role_title,''),
      '— stack:',
      coalesce(j.tech_stack,'')
    ) as description,
    /* skills: split tech_stack by comma/semicolon, also break C/C++ into C, C++  */
    (
      select array_remove(
        array_agg(distinct nullif(btrim(tok),'')), ''
      )
      from unnest(
        regexp_split_to_array(  -- split on comma/semicolon after replacing C/C++
          regexp_replace(
            regexp_replace(coalesce(j.tech_stack,''), 'C/C\+\+', 'C, C++', 'gi'),
            '/', ',', 'g'
          ),
          '[,;]'
        )
      ) as tok
    )::text[] as skills,
    j.application_link as application_url,
    /* defaults so rows show immediately */
    true::boolean as is_active,
    'internship'::text as type,
    now()::timestamptz as opens_at,
    null::timestamptz as closes_at,
    j.visa_sponsorship
  from public.jobs j
)
select * from parsed;

-- 3) Read policy so the app can select
alter table public.jobs enable row level security;
drop policy if exists "Anyone can read jobs" on public.jobs;
create policy "Anyone can read jobs" on public.jobs
  for select using (true);

-- 4) pg_trgm for similarity
create extension if not exists pg_trgm;

-- 5) Match RPC uses the adapter view
create or replace function public.match_jobs(p_student_id uuid)
returns table (
  id uuid,
  title text,
  company text,
  city text,
  description text,
  skills text[],
  hire_score int,
  application_url text
) language sql stable as $$
  select
    j.id, j.title, j.company, j.city, j.description, j.skills,
    round(similarity(array_to_string(j.skills,' '),
                     array_to_string(s.skills,' ')) * 100)::int as hire_score,
    j.application_url
  from public.jobs_for_app j
  cross join lateral (
    select coalesce(st.skills, '{}') as skills
    from public.students st
    where st.id = p_student_id
  ) s
  where coalesce(j.is_active, true)
    and (j.opens_at is null or j.opens_at <= now())
    and (j.closes_at is null or j.closes_at >= now())
  order by hire_score desc nulls last
  limit 10;
$$;