CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _email text;
BEGIN
    SELECT au.email INTO _email
    FROM auth.users au
    JOIN public.admin_users ad ON au.id = ad.id
    WHERE LOWER(ad.username) = LOWER(_username);
    
    RETURN _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated, service_role;