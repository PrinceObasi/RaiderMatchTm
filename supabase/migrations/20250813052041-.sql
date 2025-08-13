-- Drop existing trigger if it exists to ensure idempotence
DROP TRIGGER IF EXISTS trg_notify_employer_on_application_insert ON public.applications;

-- Create trigger to notify employer when new application is inserted
CREATE TRIGGER trg_notify_employer_on_application_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_employer();