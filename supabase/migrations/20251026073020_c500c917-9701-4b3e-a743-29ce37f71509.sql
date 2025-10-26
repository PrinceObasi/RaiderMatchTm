-- Fix onboarding survey not showing for new students
-- Update the trigger to explicitly set onboarding_completed to false

create or replace function public.handle_new_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create student record for users with role 'student'
  if coalesce(new.raw_user_meta_data->>'role', '') = 'student' then
    insert into public.students (user_id, name, email, is_international, onboarding_completed)
    values (
      new.id,
      concat_ws(' ',
        coalesce(new.raw_user_meta_data->>'first_name',''),
        coalesce(new.raw_user_meta_data->>'last_name','')
      ),
      new.email,
      coalesce((new.raw_user_meta_data->>'is_international')::boolean, false),
      false  -- Explicitly set to false so survey shows
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;