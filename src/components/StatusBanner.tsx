import { AlertTriangle, Database } from "lucide-react";
import type { QuinzenaData } from "@/lib/sheets";
import { useSettings } from "@/lib/settings-context";

export function StatusBanner({
  data,
  isError,
  isLoading,
}: {
  data: QuinzenaData[] | undefined;
  isError: boolean;
  isLoading: boolean;
}) {
  const { connectorType } = useSettings();
  if (isLoading) return null;
  
  const allFailed = data && data.length > 0 && data.every((d) => d.error);
  const someFailed = data && data.some((d) => d.error) && !allFailed;

  if (isError || allFailed) {
    const errorMsg = data?.find(d => d.error)?.error || "Erro de conexão";
    
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-destructive mb-1">
            Não foi possível conectar ao {connectorType === "google" ? "Google Sheets" : "Microsoft Excel"}
          </div>
          <p className="text-foreground/80 mb-2">
            {connectorType === "google" 
              ? "Certifique-se de que o arquivo foi convertido para Planilhas Google e está público como Visualizador."
              : `Ocorreu um problema ao acessar o arquivo no OneDrive: "${errorMsg}". Verifique se o conector Microsoft Excel está autorizado.`}
          </p>
          <div className="text-xs font-mono text-destructive/70 bg-destructive/5 p-2 rounded">
            {errorMsg}
          </div>
        </div>
      </div>
    );
  }

  if (someFailed) {
    const failed = data!.filter((d) => d.error).map((d) => d.quinzena).join(", ");
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 mb-4 text-sm flex gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
        <span>Algumas abas não puderam ser lidas: <strong>{failed}</strong></span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 w-fit text-xs font-medium text-success">
      <Database className="h-3 w-3" />
      Conectado ao {connectorType === "google" ? "Google Sheets" : "Microsoft Excel"}
    </div>
  );
}