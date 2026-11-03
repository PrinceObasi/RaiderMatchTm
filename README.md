# RaiderMatch

**Intelligent internship matching for Texas Tech CS students.**

> **600+ open internships from 300+ companies** · synced every 4 hours and AI-enriched automatically · dead links checked every 6 hours · Supported by the Texas Tech CS department

[![CI](https://github.com/PrinceObasi/RaiderMatchTm/actions/workflows/ci.yml/badge.svg)](https://github.com/PrinceObasi/RaiderMatchTm/actions/workflows/ci.yml)
[![Live site](https://img.shields.io/badge/live-raidermatch.net-CC0000)](https://www.raidermatch.net)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## What It Does

RaiderMatch takes a student's resume and skill profile, runs it through an AI-powered matching engine, and returns ranked internship opportunities scored by **HireScore (0-100)**. Employers can post positions, review applicants, and receive email notifications when students apply.

### Key Features

- **Resume Upload & Parsing** - Upload a PDF resume; skills are extracted automatically
- **AI-Enriched Matching** - Gemini 2.5 Flash enriches listings before the weighted matcher ranks fit on a 0-100 scale
- **Student Dashboard** - Ranked matches with matched and missing skills, an application tracker, and a profile page with a profile-strength checklist
- **Employer Dashboard** - Post internships, review applicants, manage listings with analytics
- **Application Tracking** - Full lifecycle tracking from submission to decision
- **Email Notifications** - Employers receive alerts via Resend when students apply
- **Company Logo Enrichment** - Automatic logo fetching for posted companies
- **Role-Based Auth** - Separate flows for students and employers with Supabase Auth
- **Account Management** - Profile editor, settings, password strength validation, account deletion

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (Postgres, Auth, Storage, Row-Level Security) |
| **Edge Functions** | Deno (resume upload, matching, notifications, enrichment) |
| **AI** | Gemini 2.5 Flash (internship enrichment) |
| **Email** | Resend (employer notifications) |
| **Hosting** | Vercel (frontend), Supabase (backend) |

---

## Project Structure

```
src/
  components/       UI components
    ui/             shadcn/ui primitives
    LandingPage     Marketing page with auth modal
    StudentDashboard   Resume upload, match results, application tracking
    EmployerDashboard  Job posting, applicant review, analytics
    AnalyticsDashboard Employer metrics and insights
    ProfileEditDialog  Edit school, eligibility, links, and contact details
    Settings         Account and preference management
  pages/            Route entry points
  integrations/     Supabase client and generated types
  lib/              Schemas, validators, utilities

supabase/
  functions/        Deno edge functions
    apply/          Application submission
    match/          AI-powered internship matching
    upload-resume/  Resume parsing and storage
    auto-sync-simplify/  Authenticated source sync and enrichment dispatch
    enrich-missing/     Authenticated backlog dispatch (compatibility endpoint)
    enrich-internship/  Single and bounded-batch job enrichment
    notify_employer/    Email notifications via Resend
    update-company-logos/  Logo fetching
    delete-account/     Account deletion with data cleanup
    validate-internship-links/  Flags postings whose application links have gone dead
  migrations/       SQL schema migrations
```

---

## Getting Started

### Prerequisites

- Node.js 22.12+ and [Bun 1.4.2](https://bun.sh)
- A [Supabase](https://supabase.com) project

### Install & Run

```bash
git clone https://github.com/PrinceObasi/RaiderMatchTm.git
cd RaiderMatchTm
bun install
cp .env.example .env    # fill in your Supabase keys
bun dev
```

App runs at `http://localhost:8080`.

### Environment Variables

**Frontend** (`.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

**Edge Functions** (set via `supabase secrets set`):
```
RESEND_API_KEY=...
GEMINI_API_KEY=...   # direct Gemini access
# or LOVABLE_API_KEY=... for the Lovable AI gateway
```

The sync and enrichment endpoints are internal service-to-service routes. Call them with a Supabase secret key in the `apikey` header; never expose that key in frontend code.
Any Supabase Cron job that invokes `auto-sync-simplify` must read that key server-side (for example, from Vault) and include it with the POST request.

### Deploy

**Frontend (Vercel):**
1. Connect the GitHub repo to Vercel
2. Framework preset: **Vite** | Output: `dist`
3. Add environment variables
4. Push to `main` to deploy

**Backend (Supabase):**
```bash
supabase functions deploy enrich-internship
supabase functions deploy enrich-missing
supabase functions deploy auto-sync-simplify
```

Deploy in that order: the worker accepts both the existing single-ID calls and the new batch calls before either dispatcher starts using batch mode.

The checked-in migration history predates the current production `internships` schema. Reconcile it before running `supabase db push` against the linked production project.

---

## How Matching Works

`match_internships_weighted` scores every active internship against the student's profile:

| Signal | Weight |
|--------|--------|
| Skill overlap with the role's tech stack | 55% |
| GPA | 10% |
| Prior internship experience | 10% |
| Preference fit (role, work mode, tech) | 10% |
| Posting recency | 10% |
| Project depth (from public GitHub repos) | 5% |

Each match shows the skills the student already has and the top skill they're missing.

## Keeping Listings Fresh

Scheduled with Supabase Cron:

| Job | Schedule | What it does |
|-----|----------|--------------|
| `auto-sync-simplify` | Every 4 hours | Pulls new U.S. SWE internships, deactivates closed ones |
| `enrich-missing-mopup` | Every 10 minutes | AI-enriches new listings (summary, tech stack, deadline) |
| `validate-internship-links` | Every 6 hours | Checks application links and flags dead ones |
| `flag-stale-applications` | Daily | Flags tracker entries that need a follow-up |

## Database

Key tables: `internships`, `applications`, `application_timeline`, `students`, `profiles`, `student_preferences`, `skill_aliases`

Key RPCs: `match_internships_for_user_v2`, `get_application_tracker`, `update_application_status`, `save_application`, `search_internships`

---

## License

[MIT](./LICENSE)

---

**Built for Texas Tech Red Raiders** | Contact: premekao@ttu.edu
