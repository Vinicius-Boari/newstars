import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney } from "@/lib/sheets";
import { StatusBanner } from "@/components/StatusBanner";
import { TrendingUp, Calendar, Wallet, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.6 0.18 200)",
  "oklch(0.55 0.2 340)",
  "oklch(0.65 0.18 100)",
  "oklch(0.5 0.18 280)",
  "oklch(0.65 0.2 40)",
];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground tabular-nums">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function Index() {
  const { data, isLoading, isError } = useSheetsData();

  const { stats, perQuinzena, topClientes } = React.useMemo(() => {
    const quinzenas = data ?? [];
    const allReg = quinzenas.flatMap((q) => q.registros);
    const totalGeral = allReg.reduce((s, r) => s + r.receber, 0);
    const pedidosUnicos = new Set(allReg.map((r) => r.pedido)).size;

    const proxima = quinzenas.find((q) => q.total > 0);

    // group by client
    const clienteMap = new Map<string, number>();
    for (const r of allReg) {
      clienteMap.set(r.nome, (clienteMap.get(r.nome) ?? 0) + r.receber);
    }
    const topClientes = [...clienteMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const perQuinzena = quinzenas.map((q) => ({
      name: q.quinzena,
      total: Number(q.total.toFixed(2)),
    }));

    return {
      stats: {
        proxima,
        totalGeral,
        pedidosUnicos,
        qtdRegistros: allReg.length,
      },
      perQuinzena,
      topClientes,
    };
  }, [data]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Visão geral das comissões sincronizadas em tempo real.
        </p>
      </div>

      <StatusBanner data={data} isError={isError} isLoading={isLoading} />

      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Próxima quinzena"
              value={fmtMoney(stats.proxima?.total ?? 0)}
              hint={stats.proxima?.quinzena ?? "—"}
              icon={Calendar}
            />
            <StatCard
              label="Total em aberto"
              value={fmtMoney(stats.totalGeral)}
              hint="Soma de todas as quinzenas"
              icon={Wallet}
            />
            <StatCard
              label="Pedidos ativos"
              value={String(stats.pedidosUnicos)}
              hint={`${stats.qtdRegistros} parcelas`}
              icon={FileText}
            />
            <StatCard
              label="Ticket médio"
              value={fmtMoney(
                stats.qtdRegistros ? stats.totalGeral / stats.qtdRegistros : 0,
              )}
              hint="Por parcela"
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">A receber por quinzena</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perQuinzena} margin={{ left: -10, right: 10 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(v: number) => fmtMoney(v)}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Top 10 clientes</h3>
              <div className="h-72">
                {topClientes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topClientes}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {topClientes.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtMoney(v)} />
                      <Legend
                        wrapperStyle={{ fontSize: 10 }}
                        formatter={(v) => String(v).slice(0, 14)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Timeline das quinzenas</h3>
            <div className="space-y-2">
              {(data ?? []).map((q) => (
                <div
                  key={q.quinzena}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                      {q.quinzena.split(" ")[0]}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{q.quinzena}</div>
                      <div className="text-xs text-muted-foreground">
                        {q.registros.length} parcela{q.registros.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-success">
                    {fmtMoney(q.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
