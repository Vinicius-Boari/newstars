import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Calendar, Wallet, Users, TrendingUp, Search, Filter, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney, extractCurrentParc, type Registro } from "@/lib/sheets";

export const Route = createFileRoute("/resumo-geral")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    quinzena: (search.quinzena as string | undefined) || "ALL",
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "#a855f7", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#8b5cf6",
];

const PCT_COLORS: Record<number, string> = {
  5: "#3b82f6",
  10: "#a855f7",
  15: "#ec4899",
};

function StatCard({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">{label}</div>
          <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</div>
          {hint && <div className="mt-1.5 text-[11px] font-medium text-muted-foreground/70">{hint}</div>}
        </div>
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ParcCell({ qtd }: { qtd: string }) {
  const { atual, partes } = extractCurrentParc(qtd);
  if (!atual) {
    return <span className="font-mono text-xs text-muted-foreground">{qtd}</span>;
  }
  return (
    <span className="font-mono text-xs text-muted-foreground">
      {partes.map((p, i) => {
        const clean = p.replace(/[()]/g, "");
        const isAtual = p.includes("(") && p.includes(")");
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="opacity-40">.</span>}
            <span className={cn(
              isAtual && "bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded ring-1 ring-purple-500/30",
            )}>
              {clean}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
}

function Dashboard() {
  const { quinzena: selectedQuinzena } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: abas = [], isLoading, isError, error } = useSheetsData();

  const [search, setSearch] = React.useState("");
  const [localFilter, setLocalFilter] = React.useState<string>("ALL");
  const [pctFilter, setPctFilter] = React.useState<string>("ALL");

  const COMMISSIONS = React.useMemo(() => abas.flatMap(a => a.registros), [abas]);
  const QUINZENAS = React.useMemo(() => abas.map(a => a.quinzena), [abas]);

  const allLocals = React.useMemo(() => {
    const s = new Set(COMMISSIONS.map(c => c.local).filter(l => l && l !== "-"));
    return [...s].sort();
  }, [COMMISSIONS]);

  const filtered = React.useMemo(() => {
    return COMMISSIONS.filter(c => {
      if (selectedQuinzena !== "ALL" && c.quinzena !== selectedQuinzena) return false;
      if (localFilter !== "ALL" && c.local !== localFilter) return false;
      if (pctFilter !== "ALL" && String(c.pct) !== pctFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.nome.toLowerCase().includes(q) && !c.pedido.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [selectedQuinzena, localFilter, pctFilter, search, COMMISSIONS]);

  const stats = React.useMemo(() => {
    const totalReceber = filtered.reduce((s, c) => s + c.receber, 0);
    const clientesUnicos = new Set(filtered.map(c => c.nome)).size;
    const maiorComissao = filtered.reduce((m, c) => c.receber > m ? c.receber : m, 0);
    return { totalReceber, clientesUnicos, maiorComissao, qtd: filtered.length };
  }, [filtered]);

  const perQuinzena = React.useMemo(() => {
    return abas.map(a => ({
      name: a.quinzena,
      total: a.total,
    }));
  }, [abas]);

  const perCidade = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      if (!c.local || c.local === "-") continue;
      map.set(c.local, (map.get(c.local) ?? 0) + c.receber);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const perPct = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const c of filtered) {
      map.set(c.pct, (map.get(c.pct) ?? 0) + c.receber);
    }
    return [...map.entries()].map(([pct, value]) => ({ name: `${pct}%`, value, pct }));
  }, [filtered]);

  const topClientes = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      map.set(c.nome, (map.get(c.nome) ?? 0) + c.receber);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const setQuinzena = (q: string) => navigate({ search: { quinzena: q } });
  const clearFilters = () => { setSearch(""); setLocalFilter("ALL"); setPctFilter("ALL"); };

  if (isLoading && abas.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando dados da planilha...</p>
      </div>
    );
  }

  if (isError && abas.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
          <X className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Falha ao carregar dados</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {error || "Verifique se a planilha está pública e as credenciais API estão corretas no .env"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">CONTROLE DE COMISSÕES 2026</h2>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Acompanhe vendas, parcelas e comissões a receber por quinzena.
          </p>
        </div>
        <div className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-card border border-border rounded-full px-4 py-2">
          {filtered.length} parcelas · {selectedQuinzena === "ALL" ? "Todas quinzenas" : selectedQuinzena}
        </div>
      </div>

      {/* Quinzena tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setQuinzena("ALL")}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
            selectedQuinzena === "ALL"
              ? "bg-foreground text-background shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Todas
        </button>
        {abas.map(aba => {
          const q = aba.quinzena;
          const total = aba.total;
          const active = selectedQuinzena === q;
          return (
            <button
              key={q}
              onClick={() => setQuinzena(q)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                active
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {q}
              <span className={cn("text-[10px] font-mono opacity-70", total === 0 && "opacity-30")}>
                {total > 0 ? fmtMoney(total).replace("R$", "").trim() : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total a receber"
          value={fmtMoney(stats.totalReceber)}
          hint={`${stats.qtd} parcelas filtradas`}
          icon={Wallet}
          accent="bg-green-500/15 text-green-600"
        />
        <StatCard
          label="Clientes únicos"
          value={String(stats.clientesUnicos)}
          hint="No filtro atual"
          icon={Users}
          accent="bg-purple-500/15 text-purple-600"
        />
        <StatCard
          label="Maior comissão"
          value={fmtMoney(stats.maiorComissao)}
          hint="Parcela individual"
          icon={TrendingUp}
          accent="bg-pink-500/15 text-pink-600"
        />
        <StatCard
          label="Período selecionado"
          value={selectedQuinzena === "ALL" ? "TODOS" : selectedQuinzena}
          hint={selectedQuinzena === "ALL"
            ? fmtMoney(allRegistros.reduce((s,c)=>s+c.receber,0)) + " total geral"
            : "Vencimento da quinzena"}
          icon={Calendar}
          accent="bg-blue-500/15 text-blue-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">A receber por quinzena</h3>
          <p className="text-[11px] text-muted-foreground/60 mb-3">Timeline sincronizada em tempo real</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perQuinzena} margin={{ left: -10, right: 10, top: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                <Tooltip
                  formatter={(v: number) => fmtMoney(v)}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {perQuinzena.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#a855f7" : "#ec4899"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Distribuição por % comissão</h3>
          <div className="h-64">
            {perPct.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={perPct} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={3}>
                    {perPct.map((d, i) => <Cell key={i} fill={PCT_COLORS[d.pct] ?? CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou pedido…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm max-w-md"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="ALL">Todas as cidades</option>
              {allLocals.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={pctFilter}
              onChange={(e) => setPctFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-background text-xs font-medium cursor-pointer"
            >
              <option value="ALL">Todas as %</option>
              <option value="5">5%</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
            </select>
            {(search || localFilter !== "ALL" || pctFilter !== "ALL") && (
              <button
                onClick={clearFilters}
                className="h-9 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent flex items-center gap-1.5"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Pedido</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Local</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">Total</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">%</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">Vl Parc</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Qtd Parc</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-center">Venc</th>
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-green-600 font-bold text-right">Receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((c, i) => (
                <tr key={`${c.pedido}-${i}`} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-3 py-3 text-xs whitespace-nowrap">{c.data}</td>
                  <td className="px-3 py-3 text-xs font-mono text-muted-foreground">{c.pedido}</td>
                  <td className="px-3 py-3 text-xs font-bold uppercase truncate max-w-[200px]">{c.nome}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{c.local}</td>
                  <td className="px-3 py-3 text-xs text-right tabular-nums">{fmtMoney(c.total)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-inset",
                      c.pct === 5 ? "bg-blue-500/10 text-blue-600 ring-blue-500/20" :
                      c.pct === 10 ? "bg-purple-500/10 text-purple-600 ring-purple-500/20" :
                      "bg-pink-500/10 text-pink-600 ring-pink-500/20"
                    )}>
                      {c.pct}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-right tabular-nums text-muted-foreground">{fmtMoney(c.vlParc)}</td>
                  <td className="px-3 py-3"><ParcCell qtd={c.qtdParc} /></td>
                  <td className="px-3 py-3 text-center text-xs text-muted-foreground">{c.venc}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-bold text-green-600">{fmtMoney(c.receber)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
