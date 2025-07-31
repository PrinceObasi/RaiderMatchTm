# RaiderMatch - Texas Tech Internship Matching Platform

**Upload résumé, get matched—no spam.**

RaiderMatch is an intelligent internship matching platform designed specifically for Texas Tech Computer Science students. Our algorithm analyzes resumes and returns exactly three internship matches ranked by HireScore (0-100), making it easier than ever to find the perfect internship opportunity.

## 🚀 Features

### For Students
- **One-click resume upload** (PDF format)
- **Smart matching algorithm** that returns exactly 3 ranked opportunities
- **HireScore system** (0-100) showing your fit for each position
- **Instant application** with one-click apply functionality

### For Employers
- **Simple job posting** with title, description, and location
- **Candidate dashboard** showing applications sorted by HireScore
- **Interview invitations** with one-click candidate management
- **Resume access** and candidate communication tools

### For Admins
- **Read-only dashboard** with key metrics
- **Application tracking** and interview rate analytics
- **Platform usage statistics**

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **UI Components**: shadcn/ui with custom Texas Tech theming
- **Authentication**: Ready for Supabase integration
- **State Management**: React hooks with Context API ready
- **Icons**: Lucide React
- **Styling**: Custom design system with Texas Tech Red theme

## 🎨 Design System

RaiderMatch features a professional design system built around Texas Tech's brand colors:

- **Primary Color**: Texas Tech Red (#CC0000)
- **Typography**: Inter font family for modern readability
- **Components**: Enhanced shadcn/ui components with custom variants
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design approach

## 📋 Current Implementation

This is a fully functional frontend MVP with:

- ✅ Landing page with clear value proposition
- ✅ Student dashboard with resume upload simulation
- ✅ Employer dashboard with job posting and candidate management
- ✅ Authentication modal system
- ✅ Mock data and simulated API interactions
- ✅ Responsive design optimized for all devices
- ✅ Professional UI with Texas Tech branding

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd raidermatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:8080`

## 📧 Email Setup

1. Copy `.env.example` to `.env.local` and set `RESEND_API_KEY`:
   ```bash
   cp .env.example .env.local
   # then open .env.local and paste your key
   ```

Or via Supabase CLI:
```bash
supabase functions secrets set RESEND_API_KEY <your-key>
supabase functions deploy notify_employer
```

Or via Supabase Dashboard → Edge Functions → Settings → Secrets → add RESEND_API_KEY.

## 🔮 Next Steps for Full Implementation

To complete the full-stack implementation, you would need to:

### 1. Database Setup (Supabase)
```sql
-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gpa NUMERIC,
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employers table  
CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID REFERENCES employers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  job_id UUID REFERENCES jobs(id),
  hire_score NUMERIC,
  status TEXT DEFAULT 'applied',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Backend API Routes
- `POST /api/upload-resume` - Resume storage and parsing
- `GET /api/match?student_id=` - Matching algorithm
- `POST /api/apply` - Application submission
- `POST /api/employer/invite` - Interview invitations

### 3. Authentication Integration
- Supabase Auth integration
- Row Level Security (RLS) policies
- Protected routes and middleware

### 4. File Storage
- Supabase Storage for PDF resumes
- Resume parsing with libraries like `resume-parser`

### 5. Matching Algorithm
- PostgreSQL `pg_trgm` for text similarity
- Machine learning scoring system
- Skills and experience matching logic

### 6. Email Integration
- SendGrid for notifications
- Application confirmations
- Interview invitations

## 📱 Demo Usage

1. **Landing Page**: Visit the homepage to see the value proposition
2. **Student Flow**: 
   - Click "Get Started" 
   - Create a student account
   - Upload a resume (any PDF for demo)
   - Click "Refresh Matches" to see mock internship matches
   - Apply to positions with one click

3. **Employer Flow**:
   - Click "Employer" button
   - Create an employer account
   - Post a new internship
   - View candidate applications and HireScores
   - Send interview invitations

## 🎯 Core Value Proposition

**For Students**: "Upload your resume and get perfect internship matches ranked by how likely you are to get hired - no spam, no endless scrolling."

**For Employers**: "See only the most qualified candidates for your internships, pre-ranked by our algorithm so you can focus on the best fits."

## 🏗 Architecture Notes

- **Component Structure**: Modular React components with clear separation of concerns
- **State Management**: Local state with hooks, ready for global state management
- **Type Safety**: Full TypeScript implementation with proper interfaces
- **Styling**: Utility-first CSS with Tailwind and semantic design tokens
- **Performance**: Optimized for fast loading and smooth interactions

## 📞 Support

For questions about RaiderMatch or Texas Tech CS internship opportunities, please contact the CS department or the platform administrators.

---

**Built with ❤️ for Texas Tech Red Raiders**