BEGIN;

-- Admin identity is a server-managed Supabase Auth claim. Never read the
-- user-editable user_metadata object for authorization decisions.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- The dashboard receives aggregates through one claim-checked function rather
-- than broad SELECT access to every student's rows. The checked-in history
-- predates parts of the live internships schema, so guard the live-only tables.
DO $admin_migration$
BEGIN
  IF to_regclass('public.students') IS NOT NULL
    AND to_regclass('public.applications') IS NOT NULL
    AND to_regclass('public.internships') IS NOT NULL
  THEN
    EXECUTE $function$
      CREATE OR REPLACE FUNCTION public.get_admin_analytics()
      RETURNS jsonb
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $body$
      DECLARE
        total_students integer;
        total_applications integer;
        recent_signups integer;
      BEGIN
        IF NOT public.is_admin() THEN
          RAISE EXCEPTION 'Admin access required'
            USING ERRCODE = '42501';
        END IF;

        SELECT count(*)::integer
          INTO total_students
          FROM public.students;

        SELECT count(*)::integer
          INTO total_applications
          FROM public.applications
          WHERE applied_at IS NOT NULL;

        SELECT count(*)::integer
          INTO recent_signups
          FROM public.students
          WHERE created_at >= now() - interval '7 days';

        RETURN jsonb_build_object(
          'totalStudents', total_students,
          'totalApplications', total_applications,
          'applicationRate', CASE
            WHEN total_students > 0
              THEN (total_applications::numeric / total_students::numeric) * 100
            ELSE 0
          END,
          'recentSignups', recent_signups,
          'activeUsers', total_students,
          'signupGrowth', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'date', signup_date,
                'count', signup_count
              )
              ORDER BY signup_date
            )
            FROM (
              SELECT created_at::date AS signup_date, count(*)::integer AS signup_count
              FROM public.students
              WHERE created_at >= current_date - 30
              GROUP BY created_at::date
            ) AS daily_signups
          ), '[]'::jsonb),
          'topSkills', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('skill', skill, 'count', skill_count)
              ORDER BY skill_count DESC, skill
            )
            FROM (
              SELECT student_skill.skill, count(*)::integer AS skill_count
              FROM public.students
              CROSS JOIN LATERAL unnest(
                COALESCE(students.skills, ARRAY[]::text[])
              ) AS student_skill(skill)
              GROUP BY student_skill.skill
              ORDER BY skill_count DESC, student_skill.skill
              LIMIT 10
            ) AS ranked_skills
          ), '[]'::jsonb),
          'topCompanies', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('company', company, 'count', application_count)
              ORDER BY application_count DESC, company
            )
            FROM (
              SELECT internships.company, count(*)::integer AS application_count
              FROM public.applications
              JOIN public.internships
                ON internships.id = applications.internship_id
              WHERE applications.applied_at IS NOT NULL
              GROUP BY internships.company
              ORDER BY application_count DESC, internships.company
              LIMIT 10
            ) AS ranked_companies
          ), '[]'::jsonb)
        );
      END;
      $body$
    $function$;

    REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;
  END IF;

  -- app_secrets is server-only. Generated types show it in the live schema,
  -- but it is intentionally unavailable to anon and authenticated clients.
  IF to_regclass('public.app_secrets') IS NOT NULL THEN
    ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.app_secrets FROM PUBLIC, anon, authenticated;
    GRANT ALL ON TABLE public.app_secrets TO service_role;
  END IF;

  -- These legacy SECURITY DEFINER RPCs accept arbitrary user IDs. The active
  -- frontend does not call either one, so restrict them to trusted services.
  IF to_regprocedure('public.delete_user_data(uuid,text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text)
      TO service_role;
  END IF;

  IF to_regprocedure('public.set_profile_keywords(uuid,text[])') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.set_profile_keywords(uuid, text[])
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.set_profile_keywords(uuid, text[])
      TO service_role;
  END IF;

  -- These legacy aggregate functions were granted to every authenticated user
  -- even though they expose system-wide data. The new admin RPC replaces them.
  IF to_regprocedure('public.analytics_application_rate()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.analytics_application_rate()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_application_rate()
      TO service_role;
  END IF;

  IF to_regprocedure('public.analytics_most_searched_tech(integer)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.analytics_most_searched_tech(integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_most_searched_tech(integer)
      TO service_role;
  END IF;

  IF to_regprocedure('public.analytics_overview()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.analytics_overview()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_overview()
      TO service_role;
  END IF;

  IF to_regprocedure('public.analytics_signup_growth()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.analytics_signup_growth()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_signup_growth()
      TO service_role;
  END IF;

  IF to_regprocedure('public.analytics_top_companies(integer)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.analytics_top_companies(integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_top_companies(integer)
      TO service_role;
  END IF;

  IF to_regprocedure('public.analytics_top_tech_stacks(integer)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.analytics_top_tech_stacks(integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.analytics_top_tech_stacks(integer)
      TO service_role;
  END IF;
END;
$admin_migration$;

COMMIT;
