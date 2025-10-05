-- Add missing columns for direct link resolution (idempotent)
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS simplify_url text,
  ADD COLUMN IF NOT EXISTS direct_url text,
  ADD COLUMN IF NOT EXISTS final_domain text,
  ADD COLUMN IF NOT EXISTS is_direct boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

-- Unique index to prevent duplicate simplify URLs
CREATE UNIQUE INDEX IF NOT EXISTS ux_internships_simplify_url
  ON public.internships (simplify_url)
  WHERE simplify_url IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS ix_internships_is_direct 
  ON public.internships (is_direct);

CREATE INDEX IF NOT EXISTS ix_internships_created_at 
  ON public.internships (created_at);