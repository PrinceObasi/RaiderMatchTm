-- Enable row-level security and enforce user_id checks
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can view their own data"   ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;

CREATE POLICY "Students can insert their own data"
  ON public.students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view their own data"
  ON public.students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update their own data"
  ON public.students FOR UPDATE
  USING (auth.uid() = user_id);