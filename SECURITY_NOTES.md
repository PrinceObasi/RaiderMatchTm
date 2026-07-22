## Required console settings (run once after deployment)

### Security Configuration
1. **OTP Expiry:**  
   Supabase → Auth → Settings → Password Reset & OTP → set **OTP expiry** to `900` seconds (15 min).

2. **Leaked-Password Protection:**  
   Supabase → Auth → Settings → Security → toggle **Leaked password protection** to *Block sign-up / reset if breached*.

### Manual Steps Required
The database functions have been secured via migrations, but the following settings must be configured manually in your Supabase dashboard:

- **OTP Expiry**: Currently exceeds recommended threshold  
- **Leaked Password Protection**: Currently disabled

These settings cannot be automated and require admin access to your Supabase project dashboard.

### Admin role provisioning

The web app authorizes administrators only when Supabase Auth returns
`app_metadata.role = "admin"`. Set or remove that claim with a trusted,
server-side Auth Admin API workflow or an audited one-time maintenance action.
Never put the service-role key in the browser and never use `user_metadata` for
admin authorization.

Apply `20260722000000_secure_admin_access.sql` before enabling the admin UI. It
adds the claim-checked analytics RPC and removes browser access to legacy
privileged functions and `app_secrets`. After changing a user's app metadata,
have that user sign in again so their access token contains the current claim.
