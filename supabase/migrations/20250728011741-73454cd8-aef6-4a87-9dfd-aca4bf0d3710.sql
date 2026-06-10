-- Enforce TTU email addresses on signup
create or replace function public.check_ttu_domain()
returns trigger
language plpgsql security definer as $$
begin
  if new.email not like '%@ttu.edu' then
    raise exception 'INVALID_DOMAIN';
  end if;
  return new;
end;
$$;

create trigger ttu_domain_enforcer
before insert on auth.users
for each row execute procedure public.check_ttu_domain();