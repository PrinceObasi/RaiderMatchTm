# RaiderMatch

**Intelligent internship matching for Texas Tech CS students.**

[![CI](https://github.com/PrinceObasi/RaiderMatchTm/actions/workflows/ci.yml/badge.svg)](https://github.com/PrinceObasi/RaiderMatchTm/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/demo-raider--hire--match.vercel.app-CC0000)](https://raider-hire-match.vercel.app)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## What It Does

RaiderMatch takes a student's resume and skill profile, runs it through an AI-powered matching engine, and returns ranked internship opportunities scored by **HireScore (0-100)**. Employers can post positions, review applicants, and receive email notifications when students apply.

### Key Features

- **Resume Upload & Parsing** - Upload a PDF resume; skills and experience are extracted automatically
- **AI-Powered Matching** - Gemini 1.5 Flash scores student-internship fit on a 0-100 scale
- **Student Dashboard** - View matched internships, track applications, manage profile and preferences
- **Employer Dashboard** - Post internships, review applicants, manage listings with analytics
- **Application Tracking** - Full lifecycle tracking from submission to decision
- **Email Notifications** - Employers receive alerts via Resend when students apply
- **Company Logo Enrichment** - Automatic logo fetching for posted companies
- **Role-Based Auth** - Separate flows for students and employers with Supabase Auth
- **Account Management** - Profile wizard, settings, password strength validation, account deletion

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (Postgres, Auth, Storage, Row-Level Security) |
| **Edge Functions** | Deno (resume upload, matching, notifications, enrichment) |
| **AI** | Gemini 1.5 Flash (internship enrichment & matching) |
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
    ProfileWizard    Onboarding flow for new users
    Settings         Account and preference management
  pages/            Route entry points
  integrations/     Supabase client and generated types
  lib/              Schemas, validators, utilities

supabase/
  functions/        Deno edge functions
    apply/          Application submission
    match/          AI-powered internship matching
    upload-resume/  Resume parsing and storage
    enrich-internship/  AI enrichment of job listings
    notify_employer/    Email notifications via Resend
    update-company-logos/  Logo fetching
    delete-account/     Account deletion with data cleanup
  migrations/       SQL schema migrations
```

---

## Getting Started

### Prerequisites

- Node.js 18+ or [Bun](https://bun.sh)
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
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Edge Functions** (set via `supabase secrets set`):
```
RESEND_API_KEY=...
ALLOWED_ORIGIN=https://your-domain.com
```

### Deploy

**Frontend (Vercel):**
1. Connect the GitHub repo to Vercel
2. Framework preset: **Vite** | Output: `dist`
3. Add environment variables
4. Push to `main` to deploy

**Backend (Supabase):**
```bash
supabase db push                          # apply migrations
supabase functions deploy <function-name> # deploy edge functions
```

---

## Database

Key tables: `internships`, `applications`, `application_timeline`, `students`, `profiles`, `student_preferences`, `skill_aliases`

Key RPCs: `match_internships_for_user_v2`, `get_application_tracker`, `update_application_status`, `save_application`, `search_internships`

---

## License

[MIT](./LICENSE)

---

**Built for Texas Tech Red Raiders** | Contact: premekao@ttu.edu
