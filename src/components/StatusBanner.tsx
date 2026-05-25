import { AlertTriangle } from "lucide-react";
import type { QuinzenaData } from "@/lib/sheets";

export function StatusBanner({
  data,
  isError,
  isLoading,
}: {
  data: QuinzenaData[] | undefined;
  isError: boolean;
  isLoading: boolean;
}) {
  if (isLoading) return null;
  const allFailed = data && data.length > 0 && data.every((d) => d.error);
  const someFailed = data && data.some((d) => d.error) && !allFailed;

  if (isError || allFailed) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-destructive mb-1">
            Não foi possível ler a planilha
          </div>
          <p className="text-foreground/80">
            Certifique-se de que o arquivo foi convertido (<strong>Arquivo → Salvar como Planilhas Google</strong>) e está público (<strong>Compartilhar → Qualquer pessoa com o link → Visualizador</strong>).
            Depois clique em 🔄 para tentar novamente.
          </p>
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
  return null;
}