
-- Drop the password column - not used for authentication (Supabase auth.users handles that)
ALTER TABLE public.admin_users DROP COLUMN IF EXISTS password;

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Anyone can view admins" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can manage admins" ON public.admin_users;

-- Security definer function for role-based check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- New policies: only admins can read/manage admin_users
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Allow each authenticated user to read their own admin_users row (so the app can resolve username/role)
CREATE POLICY "Users can view their own admin row"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Security definer function to resolve username -> email for login (no client-side mapping)
CREATE OR REPLACE FUNCTION public.get_email_for_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.admin_users a ON a.id = u.id
  WHERE lower(a.username) = lower(_username)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
