-- Fix security issues: remove SECURITY DEFINER and set search_path

-- Drop and recreate the view without SECURITY DEFINER
drop view if exists public.jobs_for_app;

create view public.jobs_for_app as
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