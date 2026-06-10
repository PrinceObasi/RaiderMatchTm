
-- Set fixed search_path on functions missing it
ALTER FUNCTION public.analytics_application_rate() SET search_path = public;
ALTER FUNCTION public.analytics_most_searched_tech(integer) SET search_path = public;
ALTER FUNCTION public.analytics_overview() SET search_path = public;
ALTER FUNCTION public.analytics_signup_growth() SET search_path = public;
ALTER FUNCTION public.analytics_top_companies(integer) SET search_path = public;
ALTER FUNCTION public.analytics_top_tech_stacks(integer) SET search_path = public;
ALTER FUNCTION public.enforce_us_undergrad_internships() SET search_path = public;
ALTER FUNCTION public.get_application_tracker(uuid) SET search_path = public;
ALTER FUNCTION public.get_internships_needing_enrichment(integer) SET search_path = public;
ALTER FUNCTION public.get_tracker_summary(uuid) SET search_path = public;
ALTER FUNCTION public.log_application_status_change() SET search_path = public;
ALTER FUNCTION public.match_internships_weighted(uuid, integer) SET search_path = public;
ALTER FUNCTION public.norm_text(text) SET search_path = public;
ALTER FUNCTION public.resolve_skill(text) SET search_path = public;
ALTER FUNCTION public.save_internship(uuid) SET search_path = public;
ALTER FUNCTION public.search_internships(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.send_welcome_email() SET search_path = public;

-- Revoke anonymous access to sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.analytics_application_rate() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.analytics_most_searched_tech(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.analytics_overview() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.analytics_signup_growth() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.analytics_top_companies(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.analytics_top_tech_stacks(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_applicant_data(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_application(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_applicant_info(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_application_timeline(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_application_tracker(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_application_tracker() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_tracker_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_tracker_summary(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_internships_for_user(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_internships_for_user_v2(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.save_application(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.save_internship(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_profile_keywords(uuid, text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_application_status(uuid, text, text) FROM anon, public;

-- Ensure authenticated users can still execute the functions they need
GRANT EXECUTE ON FUNCTION public.analytics_application_rate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_most_searched_tech(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_signup_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_companies(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_top_tech_stacks(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_applicant_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_timeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_tracker(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_tracker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tracker_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tracker_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_internships_for_user(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_internships_for_user_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_internship(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_keywords(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_application_status(uuid, text, text) TO authenticated;
