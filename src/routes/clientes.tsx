import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Search } from "lucide-react";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney } from "@/lib/sheets";
import { StatusBanner } from "@/components/StatusBanner";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
});

interface ClienteAgg {
  nome: string;
  total: number;
  parcelas: number;
  porQuinzena: Record<string, number>;
  locais: Set<string>;
}

function ClientesPage() {
  const { data, isLoading, isError } = useSheetsData();
  const [query, setQuery] = React.useState("");

  const quinzenas = (data ?? []).map((q) => q.quinzena);

  const clientes = React.useMemo<ClienteAgg[]>(() => {
    const map = new Map<string, ClienteAgg>();
    for (const q of data ?? []) {
      for (const r of q.registros) {
        let c = map.get(r.nome);
        if (!c) {
          c = {
            nome: r.nome,
            total: 0,
            parcelas: 0,
            porQuinzena: {},
            locais: new Set(),
          };
          map.set(r.nome, c);
        }
        c.total += r.receber;
        c.parcelas += 1;
        c.porQuinzena[r.quinzena] = (c.porQuinzena[r.quinzena] ?? 0) + r.receber;
        if (r.local) c.locais.add(r.local);
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Clientes</h2>
        <p className="text-sm text-muted-foreground">
          {clientes.length} cliente{clientes.length === 1 ? "" : "s"} com comissões em aberto.
        </p>
      </div>

      <StatusBanner data={data} isError={isError} isLoading={isLoading} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full pl-9 pr-3 h-9 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Local</th>
                <th className="px-3 py-2 font-medium text-right">Parcelas</th>
                {quinzenas.map((q) => (
                  <th key={q} className="px-3 py-2 font-medium text-right whitespace-nowrap">
                    {q}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5 + quinzenas.length} className="text-center py-10 text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5 + quinzenas.length} className="text-center py-10 text-muted-foreground">
                    Nenhum cliente
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.nome} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{c.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {[...c.locais].join(", ")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.parcelas}</td>
                    {quinzenas.map((q) => (
                      <td key={q} className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {c.porQuinzena[q] ? fmtMoney(c.porQuinzena[q]) : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-success">
                      {fmtMoney(c.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}