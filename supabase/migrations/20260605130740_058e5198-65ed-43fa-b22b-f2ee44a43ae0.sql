-- 1) Add UPDATE policy on sheets (owner or admin)
CREATE POLICY "Users can update their own sheets"
ON public.sheets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Lock down SECURITY DEFINER function is_admin: only callable by definer/service_role.
--    It is only used inside RLS policies (which run as the table owner), so no app role needs EXECUTE.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- 3) get_email_for_username MUST stay callable by anon (used at login to resolve username -> email).
--    Restrict to anon only (no need for authenticated to call it) and harden by revoking PUBLIC.
REVOKE EXECUTE ON FUNCTION public.get_email_for_username(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_for_username(text) TO anon;