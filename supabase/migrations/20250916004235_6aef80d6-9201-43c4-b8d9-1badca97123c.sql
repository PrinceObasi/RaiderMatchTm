-- Fix security issues - update function with proper search_path
CREATE OR REPLACE FUNCTION confirm_application(click_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  click_record RECORD;
  new_application_id UUID;
BEGIN
  -- Get the click record
  SELECT * INTO click_record 
  FROM application_clicks 
  WHERE id = click_id AND user_id = auth.uid() AND NOT confirmed;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Click record not found or already confirmed');
  END IF;
  
  -- Insert into applications table (for jobs only, internships use different tracking)
  IF click_record.job_id IS NOT NULL THEN
    INSERT INTO applications (user_id, job_id, status, applied_at)
    VALUES (click_record.user_id, click_record.job_id, 'applied', now())
    ON CONFLICT (user_id, job_id) DO NOTHING
    RETURNING id INTO new_application_id;
  END IF;
  
  -- Mark the click as confirmed
  UPDATE application_clicks 
  SET confirmed = TRUE, confirmation_date = now()
  WHERE id = click_id;
  
  RETURN jsonb_build_object('success', true, 'application_id', new_application_id);
END;
$$;