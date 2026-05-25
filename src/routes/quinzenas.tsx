import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useSheetsData } from "@/hooks/use-sheets-data";
import { fmtMoney } from "@/lib/sheets";
import { quinzenaColor } from "@/lib/quinzena-color";
import { StatusBanner } from "@/components/StatusBanner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quinzenas")({
  component: QuinzenasPage,
});

function QuinzenasPage() {
  const { data, isLoading, isError } = useSheetsData();
  const [open, setOpen] = React.useState<string | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Por Quinzena</h2>
        <p className="text-sm text-muted-foreground">
          Comissões agrupadas por data de recebimento.
        </p>
      </div>
      <StatusBanner data={data} isError={isError} isLoading={isLoading} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(data ?? []).map((q) => {
          const isOpen = open === q.quinzena;
          return (
            <div
              key={q.quinzena}
              className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/10"
            >
              <button
                onClick={() => setOpen(isOpen ? null : q.quinzena)}
                className="w-full p-5 text-left cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                        quinzenaColor(q.quinzena),
                      )}
                    >
                      {q.quinzena}
                    </span>
                    <div className="mt-3 text-2xl font-semibold tabular-nums text-success">
                      {fmtMoney(q.total)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {q.registros.length} parcela{q.registros.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-white/5 max-h-80 overflow-auto bg-black/10">
                  {q.registros.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Sem registros
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {q.registros.map((r, i) => (
                        <li
                          key={i}
                          className="px-4 py-2 flex justify-between items-center text-sm"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium">{r.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              #{r.pedido} · venc {r.venc}
                            </div>
                          </div>
                          <div className="tabular-nums font-semibold text-success ml-3">
                            {fmtMoney(r.receber)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="px-4 py-2 border-t border-border bg-muted/30 flex justify-between text-sm">
                    <span className="font-medium">Total</span>
                    <span className="tabular-nums font-semibold text-success">
                      {fmtMoney(q.total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}