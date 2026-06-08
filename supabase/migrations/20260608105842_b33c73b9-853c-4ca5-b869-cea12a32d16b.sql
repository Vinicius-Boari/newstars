REVOKE EXECUTE ON FUNCTION public.get_email_for_username(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO authenticated;