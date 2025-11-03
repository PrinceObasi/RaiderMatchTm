-- Create trigger to send welcome email when a new student is created
CREATE TRIGGER trigger_send_welcome_email
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();