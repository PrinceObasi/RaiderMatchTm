## Required console settings (run once after deployment)
1. **OTP Expiry:**  
   Supabase → Auth → Settings → Password Reset & OTP → set **OTP expiry** to `900` seconds (15 min).
2. **Leaked-Password Protection:**  
   Supabase → Auth → Settings → Security → toggle **Leaked password protection** to *Block sign-up / reset if breached*.