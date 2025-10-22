# Welcome Email System Setup Guide

Complete guide to setting up the automated welcome email system for RaiderMatch.

## 📋 Overview

When a new student signs up on RaiderMatch, they automatically receive a personalized welcome email via Resend. The system uses:

- **Supabase Edge Function** (`send-welcome`) to send emails via Resend API
- **Database Triggers** to automatically call the function on new user signups
- **Resend** for reliable email delivery

## 🚨 Critical Requirements

### 1. Verify Email Domain in Resend

**This is the #1 reason email sending fails.**

- Go to [Resend Domains](https://resend.com/domains)
- Add and verify `raidermatch.app`
- Complete DNS verification (add TXT, DKIM records)
- Wait for verification (can take up to 48 hours)

### 2. Set `verify_jwt = false`

**This is the #2 reason the system fails.**

The database trigger calls the edge function without a JWT token, so the function MUST have `verify_jwt = false` in `supabase/config.toml`:

```toml
[functions.send-welcome]
verify_jwt = false
```

Without this, you'll get 401 errors from the database trigger.

## 🚀 Quick Setup (Automated)

Run the automated setup script:

```bash
chmod +x scripts/setup-welcome-email.sh
./scripts/setup-welcome-email.sh
```

The script will:
1. Deploy the edge function
2. Set required secrets (RESEND_API_KEY, HOOK_SECRET)
3. Configure database hook secret
4. Apply database migrations

## 🔧 Manual Setup

If you prefer to set up manually:

### Step 1: Get Your Resend API Key

1. Go to [Resend API Keys](https://resend.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `re_`)

### Step 2: Generate Hook Secret

```bash
openssl rand -hex 32
```

Save this value - you'll need it in multiple places.

### Step 3: Deploy Edge Function

```bash
supabase functions deploy send-welcome --project-ref tjahvypvfrjulnqmnhsh
```

### Step 4: Set Supabase Secrets

```bash
supabase secrets set RESEND_API_KEY="re_your_key_here" --project-ref tjahvypvfrjulnqmnhsh
supabase secrets set HOOK_SECRET="your_generated_secret" --project-ref tjahvypvfrjulnqmnhsh
```

### Step 5: Set Database Hook Secret

Edit `scripts/set-db-secret.sql` and replace `your-actual-hook-secret-here` with your hook secret, then run:

```bash
supabase db execute --project-ref tjahvypvfrjulnqmnhsh --file scripts/set-db-secret.sql
```

Or connect directly via psql:

```sql
alter database postgres set app.settings.hook_secret = 'your_generated_secret';
```

### Step 6: Apply Database Migration

```bash
supabase db push --project-ref tjahvypvfrjulnqmnhsh
```

## 🧪 Testing

### Test the Edge Function Directly

```bash
./scripts/test-welcome-email.sh your-email@ttu.edu "Test Student"
```

Or with curl:

```bash
curl -X POST 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/send-welcome' \
  -H 'Content-Type: application/json' \
  -H 'x-hook-secret: your_hook_secret' \
  -d '{"to":"test@ttu.edu","name":"Test Student"}'
```

### Test Complete Flow (Signup → Email)

1. Sign up a new user on RaiderMatch
2. Check the function logs: [Function Logs](https://supabase.com/dashboard/project/tjahvypvfrjulnqmnhsh/functions/send-welcome/logs)
3. Check Resend dashboard: [Resend Emails](https://resend.com/emails)

## 📁 File Structure

```
raidermatch/
├── supabase/
│   ├── functions/
│   │   └── send-welcome/
│   │       └── index.ts              # Edge function code
│   ├── migrations/
│   │   └── 20251022_welcome_email_system.sql  # Database setup
│   └── config.toml                   # Function configuration
├── scripts/
│   ├── setup-welcome-email.sh        # Automated setup
│   ├── test-welcome-email.sh         # Testing script
│   └── set-db-secret.sql             # Manual DB secret setup
└── docs/
    └── WELCOME_EMAIL_SETUP.md        # This file
```

## 🔍 System Architecture

```
┌─────────────────┐
│  User Signs Up  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  auth.users INSERT      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Trigger:               │
│  on_auth_user_created   │
│  → handle_new_user()    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  public.profiles INSERT │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Trigger:               │
│  tr_profiles_welcome    │
│  → send_welcome_email() │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  HTTP POST via pg_net   │
│  to Edge Function       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  send-welcome function  │
│  validates HOOK_SECRET  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Resend API             │
│  sends email            │
└─────────────────────────┘
```

## 🔑 Secrets Reference

| Secret Name | Where to Set | Purpose |
|------------|--------------|---------|
| `RESEND_API_KEY` | Supabase Function Secrets | Authenticate with Resend API |
| `HOOK_SECRET` | Supabase Function Secrets + Database | Authenticate trigger → function calls |

## 🐛 Troubleshooting

### Email Not Sending

1. **Check domain verification**
   - Go to [Resend Domains](https://resend.com/domains)
   - Verify `raidermatch.app` is verified

2. **Check function logs**
   - [View logs](https://supabase.com/dashboard/project/tjahvypvfrjulnqmnhsh/functions/send-welcome/logs)
   - Look for authentication or Resend API errors

3. **Verify secrets are set**
   ```bash
   # Check function secrets (won't show values)
   supabase secrets list --project-ref tjahvypvfrjulnqmnhsh
   
   # Check database secret
   # Run in SQL editor:
   SELECT current_setting('app.settings.hook_secret', true);
   ```

4. **Check verify_jwt setting**
   - Ensure `supabase/config.toml` has:
     ```toml
     [functions.send-welcome]
     verify_jwt = false
     ```

### Getting 401 Errors

This usually means:
- `verify_jwt = false` is NOT set in config.toml
- Function wasn't redeployed after config change

**Fix:**
```bash
supabase functions deploy send-welcome --project-ref tjahvypvfrjulnqmnhsh
```

### Getting 403 Errors

This means:
- HOOK_SECRET doesn't match between Supabase and database
- HOOK_SECRET not set in database

**Fix:**
```bash
# Set the database secret again
supabase db execute --project-ref tjahvypvfrjulnqmnhsh --file scripts/set-db-secret.sql
```

### Resend API Errors

Common errors:
- `403`: Domain not verified
- `validation_error`: Invalid email address
- `rate_limit_exceeded`: Too many emails sent (free tier limit)

Check [Resend dashboard](https://resend.com/emails) for details.

## 📚 Additional Resources

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Documentation](https://resend.com/docs)
- [pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net)

## 🔗 Important Links

Replace `<PROJECT-REF>` with `tjahvypvfrjulnqmnhsh`:

- **Function URL**: `https://<PROJECT-REF>.supabase.co/functions/v1/send-welcome`
- **Function Logs**: `https://supabase.com/dashboard/project/<PROJECT-REF>/functions/send-welcome/logs`
- **Edge Functions**: `https://supabase.com/dashboard/project/<PROJECT-REF>/functions`
- **Function Secrets**: `https://supabase.com/dashboard/project/<PROJECT-REF>/settings/functions`
- **Database Settings**: `https://supabase.com/dashboard/project/<PROJECT-REF>/settings/database`

---

**Need Help?** Check the function logs first - they'll tell you exactly what's wrong.