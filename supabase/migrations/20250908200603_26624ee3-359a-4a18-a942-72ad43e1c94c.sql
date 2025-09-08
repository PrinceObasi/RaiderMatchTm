-- Phase 1 & 2: Fix skills extraction and matching function

-- Create a comprehensive tech skills extraction view
create or replace view public.jobs_for_app as
with skill_extraction as (
  select
    i.id,
    i.company,
    i.role_title as title,
    nullif(btrim(split_part(coalesce(i.location,''), ',', 1)), '') as city,
    concat_ws(' ',
      coalesce(i.company,''),
      'is hiring a',
      coalesce(i.role_title,'')
    ) as description,
    
    -- Extract skills from job titles and common patterns
    (
      select array_agg(distinct skill) 
      from (
        -- Programming languages and frameworks
        select unnest(array['JavaScript', 'JS']) as skill 
        where i.role_title ilike any(array['%javascript%', '%js%', '%react%', '%node%', '%web%', '%frontend%', '%front-end%'])
        
        union select unnest(array['Python']) as skill 
        where i.role_title ilike any(array['%python%', '%django%', '%flask%', '%data%', '%ml%', '%ai%'])
        
        union select unnest(array['Java']) as skill 
        where i.role_title ilike any(array['%java%', '%spring%', '%android%'])
        
        union select unnest(array['C++', 'C']) as skill 
        where i.role_title ilike any(array['%c++%', '%cpp%', '%c %', '% c/%'])
        
        union select unnest(array['C#', '.NET']) as skill 
        where i.role_title ilike any(array['%c#%', '%.net%', '%dotnet%'])
        
        union select unnest(array['React', 'Frontend']) as skill 
        where i.role_title ilike any(array['%react%', '%frontend%', '%front-end%', '%ui%'])
        
        union select unnest(array['Backend', 'API']) as skill 
        where i.role_title ilike any(array['%backend%', '%back-end%', '%api%', '%server%'])
        
        union select unnest(array['Mobile', 'iOS', 'Android']) as skill 
        where i.role_title ilike any(array['%mobile%', '%ios%', '%android%', '%swift%'])
        
        union select unnest(array['Data Science', 'Machine Learning', 'AI']) as skill 
        where i.role_title ilike any(array['%data%', '%analytics%', '%ml%', '%ai%', '%machine%', '%intelligence%'])
        
        union select unnest(array['Cloud', 'AWS', 'Azure']) as skill 
        where i.role_title ilike any(array['%cloud%', '%aws%', '%azure%', '%devops%'])
        
        union select unnest(array['Database', 'SQL']) as skill 
        where i.role_title ilike any(array['%database%', '%sql%', '%db%'])
        
        union select unnest(array['Web Development', 'HTML', 'CSS']) as skill 
        where i.role_title ilike any(array['%web%', '%html%', '%css%'])
        
        -- Generic software engineering skills
        union select 'Software Engineering' as skill 
        where i.role_title ilike any(array['%software%', '%engineer%', '%developer%', '%programming%'])
        
        union select 'Internship' as skill -- Always include since these are all internships
        
      ) skills_extracted
      where skill is not null
    ) as skills,
    
    i.application_link as application_url,
    true::boolean as is_active,
    coalesce(i.employment_type, 'internship')::text as type,
    coalesce(i.date_posted, current_date)::date as opens_at,
    i.deadline::date as closes_at,
    i.visa_sponsorship,
    i.created_at,
    i.updated_at
  from public.internships i
)
select * from skill_extraction;

-- Create a working match function using array overlap instead of similarity
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
) language plpgsql stable set search_path = public as $$
begin
  return query
  select
    j.id, 
    j.title, 
    j.company, 
    j.city, 
    j.description, 
    coalesce(j.skills, '{}') as skills,
    -- Calculate hire score based on skill overlap
    greatest(0, least(100, 
      case 
        when array_length(j.skills, 1) > 0 and array_length(s.skills, 1) > 0 then
          round(
            (array_length(array(select unnest(j.skills) intersect select unnest(s.skills)), 1)::float / 
             greatest(array_length(j.skills, 1), 1)::float) * 100
          )::int
        else 50 -- Base score for jobs with no specific skills
      end
    )) as hire_score,
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
  order by hire_score desc, j.created_at desc
  limit 10;
end;
$$;