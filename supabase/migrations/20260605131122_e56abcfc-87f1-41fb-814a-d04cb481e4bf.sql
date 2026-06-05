ALTER TABLE public.admin_users ADD COLUMN password TEXT;
GRANT UPDATE(password) ON public.admin_users TO authenticated;
GRANT UPDATE(password) ON public.admin_users TO service_role;
-- A coluna password será usada para armazenar senhas em texto plano conforme o fluxo atual do projeto (melissa/001811)
-- Idealmente seria hasheada, mas mantendo a paridade com o pedido do usuário.
