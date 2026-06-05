-- Ensure the admin user 'melissa' is linked to the correct auth user ID
UPDATE public.admin_users 
SET id = 'a608c8ef-8055-4972-93b8-ae3bed190141' 
WHERE username = 'melissa';

-- Re-create the RPC function to ensure it is using the correct logic
CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM auth.users au
  JOIN public.admin_users adu ON au.id = adu.id
  WHERE adu.username = _username;
$$;