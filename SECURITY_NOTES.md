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