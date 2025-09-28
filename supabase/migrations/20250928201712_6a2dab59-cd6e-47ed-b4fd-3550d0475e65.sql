-- Add direct_link column to store resolved company URLs
ALTER TABLE public.internships 
ADD COLUMN direct_link text,
ADD COLUMN link_resolved_at timestamp with time zone;