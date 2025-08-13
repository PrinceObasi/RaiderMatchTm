-- Drop existing trigger if it exists to ensure idempotence
DROP TRIGGER IF EXISTS trg_notify_employer_on_application_insert ON public.applications;

-- Notify only for strong candidates (adjust threshold as needed)
CREATE TRIGGER trg_notify_employer_on_application_insert
  AFTER INSERT ON public.applications
  FOR EACH ROW
  WHEN (NEW.hire_score >= 80)
  EXECUTE FUNCTION public.notify_employer();