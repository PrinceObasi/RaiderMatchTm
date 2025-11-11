-- Create student_preferences table
CREATE TABLE public.student_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  preferred_roles TEXT[] DEFAULT '{}',
  preferred_locations TEXT[] DEFAULT '{}',
  open_to_any_location BOOLEAN DEFAULT false,
  preferred_work_mode TEXT,
  preferred_company_stages TEXT[] DEFAULT '{}',
  tech_interests TEXT[] DEFAULT '{}',
  work_authorization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE public.student_preferences ENABLE ROW LEVEL SECURITY;

-- Students can view their own preferences
CREATE POLICY "Students can view their own preferences"
ON public.student_preferences
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Students can insert their own preferences
CREATE POLICY "Students can insert their own preferences"
ON public.student_preferences
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Students can update their own preferences
CREATE POLICY "Students can update their own preferences"
ON public.student_preferences
FOR UPDATE
USING (
  student_id IN (
    SELECT id FROM public.students WHERE user_id = auth.uid()
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_student_preferences_updated_at
BEFORE UPDATE ON public.student_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();