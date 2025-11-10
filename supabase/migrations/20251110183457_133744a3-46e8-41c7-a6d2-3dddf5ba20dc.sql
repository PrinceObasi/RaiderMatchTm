-- Update the hook_secret value in app_secrets table
INSERT INTO public.app_secrets (key, value)
VALUES ('hook_secret', 'raidermatch_hook_7D6d0a3d0b9b423d')
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();