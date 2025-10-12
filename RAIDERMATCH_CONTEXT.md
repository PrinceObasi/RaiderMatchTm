# RaiderMatch - Project Context

## Overview
RaiderMatch is an intelligent internship matching platform for Texas Tech Computer Science students. It connects students with software engineering internships through smart keyword matching and profile-based recommendations.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **UI Components**: shadcn/ui, Radix UI primitives
- **Backend**: Supabase (PostgreSQL database, Auth, Storage, Edge Functions)
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: Hash-based routing via `window.location.hash`

## User Roles
1. **Students** (@ttu.edu email required): Search internships, upload resumes, track applications
2. **Employers**: Post jobs, view applicants (not fully implemented)
3. **Admins**: Import/enrich internship data

## Database Schema (Key Tables)

### `students`
- Profile data: name, email, major, GPA, graduation_year, skills, is_international
- Resume storage: resume_url (Supabase Storage bucket: `resumes`)
- Experience: work_experience (jsonb), projects (jsonb)

### `internships`
- Core: company, role_title, location, application_link, direct_link
- Enrichment: tech_stack[], job_keywords[], visa_sponsorship, jd_summary, core_requirements[]
- Metadata: date_posted, deadline, is_active, is_texas, work_mode
- Search: search_tsv (tsvector for full-text search)

### `applications`
- Tracks: user_id, internship_id, status, applied_at, hire_score, note

### `profiles`
- Stores: user_id, resume_keywords[] (normalized skills from resume parsing)

### `skill_aliases`
- Maps skill variations to canonical forms (e.g., "js" → "javascript")

## Key Features

### Student Dashboard (`StudentDashboard.tsx`)
- **Left Column**:
  - Resume upload (drag-drop, parses PDF via edge function)
  - Profile section (education, skills, work experience, projects)
  - Search filters form
- **Right Column**:
  - Tabs: Search Results, Matches, My Applications, Settings

### Search System (`InternshipSearchContainer.tsx`, `SearchForm.tsx`)
- Filters: keywords (q), locations, visa sponsorship, tech stacks
- Uses `search_internships()` DB function with pagination
- Displays enriched cards with apply tracking

### Matching Algorithm
- `match_internships_for_user()`: Matches user's resume_keywords with internship job_keywords
- Ranks by keyword overlap, excludes already-applied internships
- Edge function: `supabase/functions/match/index.ts`

### Resume Parsing
- Edge function: `supabase/functions/upload-resume/index.ts`
- Extracts: skills, GPA, graduation year, major, work experience, projects
- Stores PDF in Supabase Storage, updates `students` table

### Application Tracking
- Students toggle "Applied" on internship cards → creates `applications` record
- "My Applications" tab shows all tracked applications with notes/status

## Authentication
- Supabase Auth with email/password
- Students require @ttu.edu domain (enforced by `check_ttu_domain()` trigger)
- Role stored in `raw_user_meta_data` during signup
- Auto-creates `students` record via `handle_new_student()` trigger

## Edge Functions (Supabase)
- `upload-resume`: Parses PDF, extracts data, stores in Storage
- `match`: Returns personalized internship matches
- `enrich-internship`: Enriches job data using AI (keywords, summary)
- `apply`: Logs application events
- `notify_employer`: Sends notifications on new applications

## Current State
- ✅ Student profile management (education, skills, experience, projects)
- ✅ Resume upload and parsing
- ✅ Internship search with filters
- ✅ Keyword-based matching algorithm
- ✅ Application tracking ("My Applications")
- ✅ Admin tools for data import/enrichment
- ⚠️ Employer dashboard exists but minimal functionality
- ⚠️ Authentication fully implemented but employer flow incomplete

## Design System
- Uses semantic tokens from `src/index.css` and `tailwind.config.ts`
- HSL color space for theming (light/dark mode support)
- DO NOT use direct colors (text-white, bg-blue-500) - use semantic tokens

## Important Functions

### Database Functions
- `search_internships()`: Main search with filters
- `match_internships_for_user()`: Personalized matching
- `normalize_keywords()`: Normalizes skills using alias table
- `set_profile_keywords()`: Updates user's resume keywords
- `get_applicant_info()`: Employer view of applicants

### Key Hooks
- `useInternshipSearch`: Fetches/caches search results (TanStack Query)
- `useMatches`: Fetches personalized matches for logged-in user
- `useMyApplications`: Fetches user's application history

## Security (RLS Policies)
- Students can only view/edit their own data
- Internships are read-only for students
- Applications owned by user or viewable by job employer
- Service role has full access for admin operations

## File Structure
```
src/
├── components/
│   ├── StudentDashboard.tsx (main student view)
│   ├── InternshipSearch.tsx (search UI wrapper)
│   ├── profile/ (ProfileTab, WorkExperienceSection, etc.)
│   ├── search/ (SearchForm, SearchResults, InternshipSearchContainer)
│   └── ui/ (shadcn components)
├── hooks/ (useMatches, useMyApplications, etc.)
├── lib/ (utils, schemas, validators)
└── pages/Index.tsx (routing logic)

supabase/
├── functions/ (edge functions)
└── config.toml (edge function config)
```

## Common Patterns
- All DB queries use Supabase client: `supabase.from('table').select()`
- Edge functions use CORS headers for web access
- Forms use react-hook-form + zod schemas
- Toasts via sonner for user feedback
- File uploads to Supabase Storage buckets
