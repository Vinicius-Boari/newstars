CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    SELECT au.email
    FROM auth.users au
    JOIN public.admin_users adu ON au.id = adu.id
    WHERE LOWER(adu.username) = LOWER(_username)
    LIMIT 1
  );
END;
$$;