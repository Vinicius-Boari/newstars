CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view admins" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admins can manage admins" ON public.admin_users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE username = 'melissa' AND id = auth.uid()
  )
);

-- Seed initial admin
INSERT INTO public.admin_users (username, password, role) 
VALUES ('melissa', '001811', 'admin');