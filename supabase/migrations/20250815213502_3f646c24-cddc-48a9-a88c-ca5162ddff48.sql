-- Create function to handle new student creation
create or replace function public.handle_new_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create student record for users with role 'student'
  if coalesce(new.raw_user_meta_data->>'role', '') = 'student' then
    insert into public.students (user_id, name, email, is_international)
    values (
      new.id,
      concat_ws(' ',
        coalesce(new.raw_user_meta_data->>'first_name',''),
        coalesce(new.raw_user_meta_data->>'last_name','')
      ),
      new.email,
      coalesce((new.raw_user_meta_data->>'is_international')::boolean, false)
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to automatically create student profiles
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_student();