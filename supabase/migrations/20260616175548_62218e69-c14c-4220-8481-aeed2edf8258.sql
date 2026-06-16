CREATE TABLE public.mercados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  supermercado text NOT NULL,
  responsavel text NOT NULL,
  telefone text NOT NULL,
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mercados TO authenticated;
GRANT ALL ON public.mercados TO service_role;

ALTER TABLE public.mercados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view mercados" ON public.mercados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert mercados" ON public.mercados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update mercados" ON public.mercados FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete mercados" ON public.mercados FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_mercados_updated_at
  BEFORE UPDATE ON public.mercados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX mercados_data_idx ON public.mercados (data DESC);
CREATE INDEX mercados_supermercado_idx ON public.mercados (supermercado);
CREATE INDEX mercados_responsavel_idx ON public.mercados (responsavel);