import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Calendar, Wallet, Users, TrendingUp, Search, Filter, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COMMISSIONS, QUINZENAS, fmtMoney, extractCurrentParc, type Commission } from "@/data/commissions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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

  const [search, setSearch] = React.useState("");
  const [localFilter, setLocalFilter] = React.useState<string>("ALL");
  const [pctFilter, setPctFilter] = React.useState<string>("ALL");

  const allLocals = React.useMemo(() => {
    const s = new Set(COMMISSIONS.map(c => c.local).filter(l => l && l !== "-"));
    return [...s].sort();
  }, []);

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
  }, [selectedQuinzena, localFilter, pctFilter, search]);

  const stats = React.useMemo(() => {
    const totalReceber = filtered.reduce((s, c) => s + c.receber, 0);
    const clientesUnicos = new Set(filtered.map(c => c.nome)).size;
    const maiorComissao = filtered.reduce((m, c) => c.receber > m ? c.receber : m, 0);
    return { totalReceber, clientesUnicos, maiorComissao, qtd: filtered.length };
  }, [filtered]);

  const perQuinzena = React.useMemo(() => {
    return QUINZENAS.map(q => ({
      name: q,
      total: COMMISSIONS.filter(c => c.quinzena === q).reduce((s, c) => s + c.receber, 0),
    }));
  }, []);

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

  const calendario = React.useMemo(() => {
    const map = new Map<string, Commission[]>();
    for (const c of filtered) {
      if (!c.venc || c.venc === "-") continue;
      if (!map.has(c.venc)) map.set(c.venc, []);
      map.get(c.venc)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const setQuinzena = (q: string) => navigate({ search: { quinzena: q } });
  const clearFilters = () => { setSearch(""); setLocalFilter("ALL"); setPctFilter("ALL"); };

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
        {QUINZENAS.map(q => {
          const total = perQuinzena.find(p => p.name === q)?.total ?? 0;
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
            ? fmtMoney(COMMISSIONS.reduce((s,c)=>s+c.receber,0)) + " total geral"
            : "Vencimento da quinzena"}
          icon={Calendar}
          accent="bg-blue-500/15 text-blue-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-1">A receber por quinzena</h3>
          <p className="text-[11px] text-muted-foreground/60 mb-3">Timeline de maio a agosto de 2026</p>
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
                    {perPct.map((d, i) => <Cell key={i} fill={PCT_COLORS[d.pct] ?? CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Top 10 cidades</h3>
          <div className="h-64">
            {perCidade.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perCidade} layout="vertical" margin={{ left: 60, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={90} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Top 10 clientes</h3>
          <div className="h-64 overflow-y-auto">
            {topClientes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <ol className="space-y-2">
                {topClientes.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold w-5 text-muted-foreground tabular-nums">#{i+1}</span>
                    <span className="flex-1 text-xs font-medium text-foreground truncate">{c.name}</span>
                    <span className="text-xs font-bold tabular-nums text-green-600">{fmtMoney(c.value)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou pedido…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={localFilter}
            onChange={(e) => setLocalFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm cursor-pointer"
          >
            <option value="ALL">Todas as cidades</option>
            {allLocals.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={pctFilter}
            onChange={(e) => setPctFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm cursor-pointer"
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

      {/* Main table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Pedidos e parcelas</h3>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Parcela atual destacada em <span className="text-purple-600 font-bold">roxo</span>
            </p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
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
                <th className="px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right">A Receber</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground italic text-sm">
                    Nenhum resultado para os filtros aplicados.
                  </td>
                </tr>
              ) : filtered.map((r, i) => (
                <tr key={i} className={cn(
                  "border-b border-border/50 hover:bg-accent/40 transition-colors",
                  i % 2 === 1 && "bg-muted/10"
                )}>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{r.data}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.pedido}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground text-xs">{r.nome}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.local}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs">{fmtMoney(r.total)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn(
                      "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold",
                      r.pct === 5 && "bg-blue-500/15 text-blue-600",
                      r.pct === 10 && "bg-purple-500/15 text-purple-600",
                      r.pct === 15 && "bg-pink-500/15 text-pink-600",
                    )}>{r.pct}%</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                    {r.vlParc !== null ? fmtMoney(r.vlParc) : "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <ParcCell qtd={r.qtdParc} />
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground whitespace-nowrap">{r.venc}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs font-bold text-green-600">
                    {fmtMoney(r.receber)}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-border">
                  <td colSpan={9} className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total filtrado
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-green-600">
                    {fmtMoney(stats.totalReceber)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold">Calendário de vencimentos</h3>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Pagamentos agrupados por data de vencimento
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {calendario.length === 0 ? (
            <div className="col-span-full text-center text-sm text-muted-foreground italic py-8">
              Sem vencimentos no filtro atual.
            </div>
          ) : calendario.map(([data, items]) => {
            const totalDia = items.reduce((s, c) => s + c.receber, 0);
            return (
              <div key={data} className="rounded-lg border border-border bg-background p-3 hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">{data}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-green-600">{fmtMoney(totalDia)}</span>
                </div>
                <ul className="space-y-1">
                  {items.map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-[11px] gap-2">
                      <span className="truncate text-muted-foreground">{c.nome}</span>
                      <span className="tabular-nums font-medium shrink-0">{fmtMoney(c.receber)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
