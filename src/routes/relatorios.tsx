import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Download } from "lucide-react";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney, type Registro } from "@/lib/sheets";
import { StatusBanner } from "@/components/StatusBanner";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
});

function groupBy<K extends string>(
  rows: Registro[],
  key: (r: Registro) => K,
): { name: K; total: number; count: number }[] {
  const map = new Map<K, { total: number; count: number }>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    const c = map.get(k) ?? { total: 0, count: 0 };
    c.total += r.receber;
    c.count += 1;
    map.set(k, c);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);
}

function downloadCsv(filename: string, rows: Registro[]) {
  const header = [
    "Quinzena",
    "Data",
    "Pedido",
    "Cliente",
    "Local",
    "Total",
    "%",
    "Parcela",
    "Parcelamento",
    "Vencimento",
    "A Receber",
  ];
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.quinzena,
        r.data,
        r.pedido,
        r.nome,
        r.local,
        String(r.total),
        String(r.pct),
        String(r.vlParc),
        r.qtdParc,
        r.venc,
        String(r.receber),
      ]
        .map((v) => escape(String(v)))
        .join(","),
    );
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; total: number; count: number }[];
}) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium text-right">Parcelas</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium text-right">% do total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-muted-foreground">
                  Sem dados
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.name} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-success">
                    {fmtMoney(r.total)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {total ? ((r.total / total) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RelatoriosPage() {
  const { data, isLoading, isError } = useSheetsData();
  const all: Registro[] = React.useMemo(
    () => (data ?? []).flatMap((q) => q.registros),
    [data],
  );

  const porQuinzena = React.useMemo(() => groupBy(all, (r) => r.quinzena), [all]);
  const porCliente = React.useMemo(() => groupBy(all, (r) => r.nome), [all]);
  const porCidade = React.useMemo(() => groupBy(all, (r) => r.local || "—"), [all]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Relatórios</h2>
          <p className="text-sm text-muted-foreground">
            Totais consolidados e exportação dos dados.
          </p>
        </div>
        <button
          onClick={() => downloadCsv("comissoes.csv", all)}
          disabled={all.length === 0}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <StatusBanner data={data} isError={isError} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportTable title="Por quinzena" rows={porQuinzena} />
        <ReportTable title="Por cidade" rows={porCidade} />
        <div className="lg:col-span-2">
          <ReportTable title="Por cliente" rows={porCliente} />
        </div>
      </div>
    </div>
  );
}