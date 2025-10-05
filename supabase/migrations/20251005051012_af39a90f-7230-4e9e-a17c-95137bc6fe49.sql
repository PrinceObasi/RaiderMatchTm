-- Add columns to internships table for direct link tracking
ALTER TABLE public.internships 
ADD COLUMN IF NOT EXISTS simplify_url text,
ADD COLUMN IF NOT EXISTS direct_url text,
ADD COLUMN IF NOT EXISTS final_domain text,
ADD COLUMN IF NOT EXISTS is_direct boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_internships_created_at ON public.internships(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internships_is_direct ON public.internships(is_direct);
CREATE INDEX IF NOT EXISTS idx_internships_last_verified ON public.internships(last_verified_at);

-- Create cache table for resolved links
CREATE TABLE IF NOT EXISTS public.direct_link_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simplify_url text UNIQUE NOT NULL,
  direct_url text NOT NULL,
  final_domain text,
  is_direct boolean DEFAULT false,
  seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on cache table
ALTER TABLE public.direct_link_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage cache
CREATE POLICY "Service role can manage cache"
ON public.direct_link_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Add index on cache
CREATE INDEX IF NOT EXISTS idx_direct_link_cache_simplify_url ON public.direct_link_cache(simplify_url);
CREATE INDEX IF NOT EXISTS idx_direct_link_cache_seen_at ON public.direct_link_cache(seen_at DESC);