CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

-- Apenas anon precisa executar isso para o login
REVOKE ALL ON FUNCTION public.get_email_for_username(text) FROM authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon;