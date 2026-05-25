import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney, fmtPct, type Registro } from "@/lib/sheets";
import { quinzenaColor } from "@/lib/quinzena-color";
import { StatusBanner } from "@/components/StatusBanner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comissoes")({
  component: ComissoesPage,
});

type SortKey = keyof Registro;

function ComissoesPage() {
  const { data, isLoading, isError } = useSheetsData();
  const [query, setQuery] = React.useState("");
  const [quinzenaFilter, setQuinzenaFilter] = React.useState<string>("all");
  const [localFilter, setLocalFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "quinzena",
    dir: "asc",
  });

  const all: Registro[] = React.useMemo(
    () => (data ?? []).flatMap((q) => q.registros),
    [data],
  );

  const locais = React.useMemo(() => {
    const s = new Set(all.map((r) => r.local).filter(Boolean));
    return [...s].sort();
  }, [all]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (quinzenaFilter !== "all" && r.quinzena !== quinzenaFilter) return false;
      if (localFilter !== "all" && r.local !== localFilter) return false;
      if (q && !`${r.nome} ${r.pedido}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, query, quinzenaFilter, localFilter]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (typeof va === "number" && typeof vb === "number") {
        return sort.dir === "asc" ? va - vb : vb - va;
      }
      return sort.dir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sort]);

  const total = sorted.reduce((s, r) => s + r.receber, 0);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function SortHeader({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sort.key === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
      >
        {children}
        {active &&
          (sort.dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </button>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Comissões</h2>
          <p className="text-sm text-muted-foreground">
            Todas as parcelas unificadas. {sorted.length} registro
            {sorted.length === 1 ? "" : "s"} · <strong>{fmtMoney(total)}</strong>
          </p>
        </div>
      </div>

      <StatusBanner data={data} isError={isError} isLoading={isLoading} />

      <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
        <div className="p-5 flex flex-wrap gap-4 border-b border-white/5 bg-black/5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por cliente, pedido ou local..."
              className="w-full pl-11 pr-4 h-11 rounded-xl border-none bg-background/50 text-sm focus:ring-2 focus:ring-[#00e5ff]/20 transition-all placeholder:text-muted-foreground/30"
            />
          </div>
          <select
            value={quinzenaFilter}
            onChange={(e) => setQuinzenaFilter(e.target.value)}
            className="h-11 px-4 rounded-xl border-none bg-background/50 text-sm focus:ring-2 focus:ring-[#00e5ff]/20 transition-all cursor-pointer"
          >
            <option value="all">Todas as quinzenas</option>
            {(data ?? []).map((q) => (
              <option key={q.quinzena} value={q.quinzena}>
                {q.quinzena}
              </option>
            ))}
          </select>
          <select
            value={localFilter}
            onChange={(e) => setLocalFilter(e.target.value)}
            className="h-11 px-4 rounded-xl border-none bg-background/50 text-sm focus:ring-2 focus:ring-[#00e5ff]/20 transition-all cursor-pointer"
          >
            <option value="all">Todas as cidades</option>
            {locais.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/10 text-muted-foreground/50 text-[10px] uppercase tracking-widest font-bold">
              <tr className="text-left border-b border-white/5">
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="quinzena">Quinzena</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="data">Data</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="pedido">Pedido</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="nome">Cliente</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="local">Local</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  <SortHeader k="total">Total</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  <SortHeader k="pct">%</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  <SortHeader k="vlParc">Parcela</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="qtdParc">Parcelamento</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium">
                  <SortHeader k="venc">Vencimento</SortHeader>
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  <SortHeader k="receber">A Receber</SortHeader>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-muted-foreground">
                    Nenhum registro
                  </td>
                </tr>
              ) : (
                sorted.map((r, i) => (
                  <tr
                    key={`${r.quinzena}-${r.pedido}-${i}`}
                    className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                          quinzenaColor(r.quinzena),
                        )}
                      >
                        {r.quinzena}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {r.data}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.pedido}</td>
                    <td className="px-3 py-2 font-medium">{r.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.local}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.total)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(r.pct)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(r.vlParc)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.qtdParc}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {r.venc}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-success">
                      {fmtMoney(r.receber)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="bg-muted/30 border-t border-border">
                  <td colSpan={10} className="px-3 py-2 text-right font-medium">
                    Total filtrado
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-success">
                    {fmtMoney(total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}