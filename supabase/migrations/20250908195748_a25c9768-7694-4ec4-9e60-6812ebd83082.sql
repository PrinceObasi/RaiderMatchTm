-- Create adapter view: normalize internships CSV columns into the app shape
create or replace view public.jobs_for_app as
with parsed as (
  select
    i.id,
    i.company,
    i.role_title as title,
    /* city = text before first comma (if any) */
    nullif(btrim(split_part(coalesce(i.location,''), ',', 1)), '') as city,
    /* concise description using role+stack */
    concat_ws(' ',
      coalesce(i.company,''),
      'is hiring a',
      coalesce(i.role_title,''),
      case when array_length(i.tech_stack, 1) > 0 
           then concat('— stack: ', array_to_string(i.tech_stack, ', '))
           else ''
      end
    ) as description,
    /* skills from tech_stack array */
    coalesce(i.tech_stack, '{}')::text[] as skills,
    i.application_link as application_url,
    /* defaults so rows show immediately */
    true::boolean as is_active,
    coalesce(i.employment_type, 'internship')::text as type,
    coalesce(i.date_posted, current_date)::date as opens_at,
    i.deadline::date as closes_at,
    i.visa_sponsorship,
    i.created_at,
    i.updated_at
  from public.internships i
)
select * from parsed;

-- Update the matching RPC to use the adapter view
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
    and (j.opens_at is null or j.opens_at <= current_date)
    and (j.closes_at is null or j.closes_at >= current_date)
  order by hire_score desc nulls last
  limit 10;
$$;