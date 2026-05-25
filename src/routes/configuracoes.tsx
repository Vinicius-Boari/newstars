import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { useSettings } from "@/lib/settings-context";
import { ABAS, fetchAllSheets } from "@/lib/sheets";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
});

type TestStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; ok: number; fail: number }
  | { kind: "error"; message: string };

function ConfigPage() {
  const { sheetId, setSheetId, refreshMs, setRefreshMs } = useSettings();
  const [draft, setDraft] = React.useState(sheetId);
  const [status, setStatus] = React.useState<TestStatus>({ kind: "idle" });

  async function testConnection() {
    setStatus({ kind: "testing" });
    try {
      const result = await fetchAllSheets(draft);
      const ok = result.filter((r) => !r.error).length;
      const fail = result.length - ok;
      setStatus({ kind: "ok", ok, fail });
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
          Conexão com o Google Sheets e preferências de atualização.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3">Planilha</h3>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          ID da planilha
        </label>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Você encontra o ID na URL da planilha entre <code>/d/</code> e <code>/edit</code>.
        </p>

        <div className="mt-4 text-xs text-muted-foreground">
          Abas esperadas: <strong>{ABAS.join(", ")}</strong>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSheetId(draft.trim())}
            disabled={!draft.trim() || draft === sheetId}
            className="inline-flex items-center px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            Salvar ID
          </button>
          <button
            onClick={testConnection}
            disabled={status.kind === "testing" || !draft.trim()}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent cursor-pointer disabled:opacity-50"
          >
            {status.kind === "testing" && <Loader2 className="h-4 w-4 animate-spin" />}
            Testar conexão
          </button>
        </div>

        {status.kind === "ok" && (
          <div className="mt-4 flex items-start gap-2 text-sm rounded-md border border-success/30 bg-success/5 p-3">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
            <span>
              Conexão bem-sucedida. {status.ok} aba{status.ok === 1 ? "" : "s"} lida
              {status.ok === 1 ? "" : "s"} com sucesso
              {status.fail > 0 && `, ${status.fail} com erro`}.
            </span>
          </div>
        )}
        {status.kind === "error" && (
          <div className="mt-4 flex items-start gap-2 text-sm rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3">Atualização automática</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "30 segundos", v: 30_000 },
            { label: "1 minuto", v: 60_000 },
            { label: "5 minutos", v: 300_000 },
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

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <h3 className="font-semibold mb-1">Como tornar a planilha pública</h3>
            <ol className="list-decimal list-inside space-y-1 text-foreground/80">
              <li>Abra a planilha no Google Sheets.</li>
              <li>
                Clique em <strong>Compartilhar</strong> no canto superior direito.
              </li>
              <li>
                Em <strong>Acesso geral</strong>, selecione{" "}
                <strong>Qualquer pessoa com o link</strong>.
              </li>
              <li>
                Defina o papel como <strong>Visualizador</strong> e clique em{" "}
                <strong>Concluído</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}