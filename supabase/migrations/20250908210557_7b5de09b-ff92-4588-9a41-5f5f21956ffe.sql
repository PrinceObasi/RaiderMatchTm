-- Enable pg_trgm extension if not exists
create extension if not exists pg_trgm;

-- Replace the match_jobs function with smarter HireScore algorithm
create or replace function public.match_jobs(p_student_id uuid)
returns table (
  id uuid,
  title text,
  company text,
  city text,
  description text,
  skills text[],
  application_url text,
  overlap numeric,
  missing_skills text[],
  hire_score int
) language sql stable as $$
  with st as (
    select
      coalesce(skills, '{}')                                   as skills,
      least(coalesce(gpa, 0), 4) / 4.0                        as gpa_norm,
      case when coalesce(has_prev_intern, false) then 1 else 0 end::numeric as prev_int,
      coalesce(project_depth, 0)::numeric                      as project_depth
    from public.students
    where id = p_student_id
  )
  select
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    j.application_url,
    calc.overlap,
    calc.missing_skills,
    round(100 * (
      0.50 * calc.overlap +
      0.20 * st.gpa_norm +
      0.20 * st.prev_int +
      0.10 * st.project_depth
    ))::int as hire_score
  from public.jobs_for_app j
  cross join st
  cross join lateral (
    select
      -- Jaccard overlap: |A∩B| / |A∪B|   (0..1)
      coalesce((
        select
          case when u.cnt = 0 then 0
               else i.cnt::numeric / u.cnt::numeric end
        from
          (select count(*) as cnt
             from ((select unnest(j.skills) s)
                   union
                   (select unnest(st.skills) s)) u) u,
          (select count(*) as cnt
             from ((select unnest(j.skills) s)
                   intersect
                   (select unnest(st.skills) s)) i) i
      ), 0) as overlap,
      -- Missing job skills to coach the student
      coalesce((
        select array_agg(s) from (
          (select unnest(j.skills) s)
          except
          (select unnest(st.skills) s)
        ) ms
      ), '{}')::text[] as missing_skills
  ) calc
  -- Only show active, open internships
  where coalesce(j.is_active, true)
    and (j.opens_at is null or j.opens_at <= now())
    and (j.closes_at is null or j.closes_at >= now())
  order by hire_score desc nulls last
  limit 10;