-- Create a dedicated schema for extensions
create schema if not exists extensions;

-- Ensure logged-in users can use, but not create, objects there
grant usage on schema extensions to authenticated;

-- Re-install pg_trgm (and any other existing ext) in the new schema
drop extension if exists pg_trgm;
create extension pg_trgm schema extensions;

-- Make sure Supabase service roles search both schemas
alter role authenticator set search_path = public, extensions;