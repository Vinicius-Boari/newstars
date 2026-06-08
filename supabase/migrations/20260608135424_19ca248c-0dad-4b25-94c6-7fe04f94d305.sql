
-- 1) Restrict is_admin EXECUTE to authenticated only
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- 2) Add protected column on admin_users to prevent deleting/changing seed admin
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS protected boolean NOT NULL DEFAULT false;

-- Mark melissa as protected
UPDATE public.admin_users SET protected = true WHERE username = 'melissa';

-- Trigger to block delete/role-change of protected rows
CREATE OR REPLACE FUNCTION public.prevent_protected_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.protected THEN
      RAISE EXCEPTION 'Cannot delete protected admin user';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.protected AND (NEW.protected = false OR NEW.role <> OLD.role OR NEW.username <> OLD.username) THEN
      RAISE EXCEPTION 'Cannot modify protected admin user';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_admin_users ON public.admin_users;
CREATE TRIGGER protect_admin_users
BEFORE UPDATE OR DELETE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_admin_changes();

-- 3) Explicit INSERT policy on admin_users (only admins can insert)
DROP POLICY IF EXISTS "Only admins can insert admin users" ON public.admin_users;
CREATE POLICY "Only admins can insert admin users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 4) Tighten sheets policies to authenticated role only
DROP POLICY IF EXISTS "Users can create their own sheets" ON public.sheets;
DROP POLICY IF EXISTS "Users can delete their own sheets" ON public.sheets;
DROP POLICY IF EXISTS "Users can view their own sheets" ON public.sheets;

CREATE POLICY "Users can view their own sheets"
ON public.sheets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sheets"
ON public.sheets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sheets"
ON public.sheets FOR DELETE TO authenticated
USING (auth.uid() = user_id);
