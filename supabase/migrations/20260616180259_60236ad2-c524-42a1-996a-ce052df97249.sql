CREATE TYPE public.mercado_status AS ENUM ('prospect', 'negociacao', 'ativo', 'inativo');

ALTER TABLE public.mercados
  ADD COLUMN status public.mercado_status NOT NULL DEFAULT 'prospect',
  ADD COLUMN proxima_visita date;

CREATE INDEX mercados_status_idx ON public.mercados (status);
CREATE INDEX mercados_proxima_visita_idx ON public.mercados (proxima_visita);