-- ============================================================================
-- CRITICAL SECURITY FIX: Restrict Internships Table Access
-- ============================================================================
-- This migration addresses the critical security vulnerability where the
-- internships table (containing sensitive business data) was publicly accessible.
-- 
-- Changes:
-- 1. Drop overly permissive public access policies on internships table
-- 2. Add authentication requirement for viewing internships
-- 3. Add performance index for authenticated queries
-- ============================================================================

-- Step 1: Remove the overly permissive policies on internships table
DROP POLICY IF EXISTS "Anyone can view internships" ON public.internships;
DROP POLICY IF EXISTS "read_internships_public" ON public.internships;

-- Step 2: Create new policy requiring authentication for internships access
CREATE POLICY "Authenticated users can view internships"
ON public.internships
FOR SELECT
TO authenticated
USING (is_active = true AND coalesce(is_texas, true) = true);

-- Keep service role access for backend operations
-- (The "Service role can manage internships" policy already exists)

-- Step 3: Add index to improve performance of auth-based queries
CREATE INDEX IF NOT EXISTS idx_internships_active_texas 
ON public.internships(is_active, is_texas) 
WHERE is_active = true AND is_texas = true;

-- ============================================================================
-- SECURITY NOTES:
-- ============================================================================
-- After this migration, users MUST be authenticated to view internships.
-- This protects your business data from:
-- - Competitor scraping
-- - Unauthorized data extraction  
-- - Application link manipulation
-- 
-- Note: jobs_for_app is a view and inherits security from underlying tables.
-- Its access control is managed through the jobs table RLS policies.
-- ============================================================================