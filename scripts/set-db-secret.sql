-- Set the hook secret in database settings
-- Replace 'your-actual-hook-secret-here' with your actual HOOK_SECRET value
-- This must match the HOOK_SECRET set in Supabase function secrets

alter database postgres set app.settings.hook_secret = 'your-actual-hook-secret-here';

-- Verify it's set correctly
-- Run: SELECT current_setting('app.settings.hook_secret', true);