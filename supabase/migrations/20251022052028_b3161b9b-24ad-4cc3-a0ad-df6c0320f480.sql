-- Enable pg_net extension for HTTP requests
create extension if not exists pg_net with schema extensions;

-- Function to handle new user signup and create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer 
set search_path = public
as $$
begin
  -- Create profile entry for the new user
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  
  return new;
end;
$$;

-- Trigger to create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to send welcome email when profile is created
create or replace function public.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_url text := 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/send-welcome';
  v_hook_secret text;
begin
  -- Get user email from auth.users
  select email into v_email
  from auth.users
  where id = NEW.user_id;
  
  -- Get user name from students table if available
  select name into v_name
  from public.students
  where user_id = NEW.user_id;
  
  -- Get hook secret from database settings
  v_hook_secret := current_setting('app.settings.hook_secret', true);
  
  -- Skip if no secret is configured
  if v_hook_secret is null or v_hook_secret = '' then
    raise notice 'HOOK_SECRET not configured, skipping welcome email';
    return NEW;
  end if;

  -- Make async HTTP POST request to send-welcome edge function
  perform
    extensions.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hook-secret', v_hook_secret
      ),
      body := jsonb_build_object(
        'to', v_email,
        'name', COALESCE(v_name, 'Student')
      )::text,
      timeout_milliseconds := 8000
    );

  raise notice 'Welcome email queued for: % (%)', COALESCE(v_name, 'Student'), v_email;

  return NEW;
exception
  when others then
    raise warning 'Failed to queue welcome email for %: %', v_email, SQLERRM;
    return NEW;
end;
$$;

-- Trigger to send welcome email on profile creation
drop trigger if exists tr_profiles_welcome on public.profiles;
create trigger tr_profiles_welcome
  after insert on public.profiles
  for each row execute function public.send_welcome_email();