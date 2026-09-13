REVOKE EXECUTE ON FUNCTION public.grant_badge(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_project() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_certificate() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_discussion() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_reply() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_submission() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_project_like() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_application_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.badge_on_streak() FROM anon, authenticated, public;