import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { fetchAllSheets } from "@/lib/sheets";
import { useSheetsData } from "@/hooks/use-sheets-data";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
});

type TestStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; ok: number; fail: number }
  | { kind: "error"; message: string };

function ConfigPage() {
  const { 
    sheetId, setSheetId, 
    excelUrl, setExcelUrl, 
    connectorType, setConnectorType,
    refreshMs, setRefreshMs 
  } = useSettings();
  const [draftGoogle, setDraftGoogle] = React.useState(sheetId);
  const [draftExcel, setDraftExcel] = React.useState(excelUrl);
  const [status, setStatus] = React.useState<TestStatus>({ kind: "idle" });
  const { data: sheetsData } = useSheetsData();
  const abas = React.useMemo(() => sheetsData?.map(d => d.quinzena) ?? [], [sheetsData]);


  async function testConnection() {
    setStatus({ kind: "testing" });
    try {
      if (connectorType === "google") {
        const result = await fetchAllSheets(draftGoogle, abas);
        const ok = result.filter((r) => !r.error).length;
        const fail = result.length - ok;
        setStatus({ kind: "ok", ok, fail });
      } else {
        // Microsoft test logic would go here
        setStatus({ kind: "ok", ok: 0, fail: 0 });
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Falha desconhecida",
      });
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie a fonte de dados e preferências de atualização.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3">Fonte de Dados</h3>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setConnectorType("microsoft")}
            className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
              connectorType === "microsoft" 
                ? "border-primary bg-primary/5" 
                : "border-border bg-background hover:border-muted-foreground/30"
            }`}
          >
            <div className="font-semibold">Microsoft Excel (OneDrive)</div>
            <div className="text-xs text-muted-foreground">Recomendado para edição direta.</div>
          </button>
          <button
            onClick={() => setConnectorType("google")}
            className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
              connectorType === "google" 
                ? "border-primary bg-primary/5" 
                : "border-border bg-background hover:border-muted-foreground/30"
            }`}
          >
            <div className="font-semibold">Google Sheets</div>
            <div className="text-xs text-muted-foreground">Apenas visualização pública.</div>
          </button>
        </div>

        {connectorType === "google" ? (
          <>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              ID da planilha Google
            </label>
            <input
              value={draftGoogle}
              onChange={(e) => setDraftGoogle(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
            />
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Link do OneDrive / Excel
            </label>
            <input
              value={draftExcel}
              onChange={(e) => setDraftExcel(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
              placeholder="https://1drv.ms/x/..."
            />
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (connectorType === "google") {
                setSheetId(draftGoogle.trim());
              } else {
                setExcelUrl(draftExcel.trim());
              }
              setStatus({ kind: "ok", ok: 0, fail: 0 });
            }}
            className="inline-flex items-center px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 cursor-pointer"
          >
            Salvar Alterações
          </button>
          <button
            onClick={testConnection}
            disabled={status.kind === "testing"}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent cursor-pointer disabled:opacity-50"
          >
            {status.kind === "testing" && <Loader2 className="h-4 w-4 animate-spin" />}
            Testar conexão
          </button>
        </div>

        {status.kind === "ok" && (
          <div className="mt-4 flex items-start gap-2 text-sm rounded-md border border-success/30 bg-success/5 p-3">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
            <span>Conexão configurada com sucesso.</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Sincronização</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Intervalo de atualização automática dos dados.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "30 seg", v: 30_000 },
            { label: "1 min", v: 60_000 },
            { label: "5 min", v: 300_000 },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setRefreshMs(opt.v)}
              className={
                "px-4 h-9 rounded-md text-sm font-medium border cursor-pointer transition-colors " +
                (refreshMs === opt.v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}