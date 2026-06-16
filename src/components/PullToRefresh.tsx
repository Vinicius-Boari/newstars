import * as React from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";

interface Props {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Indicador visual fixo no topo. Aparece somente enquanto o usuário
 * está puxando ou enquanto a sincronização está em andamento.
 */
export function PullToRefreshIndicator({ onRefresh, disabled }: Props) {
  const { pull, refreshing, threshold } = usePullToRefresh({ onRefresh, disabled });
  const visible = pull > 0 || refreshing;
  const reached = pull >= threshold;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-start justify-center transition-opacity",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ transform: `translateY(${Math.max(0, pull - 24)}px)` }}
    >
      <div className="mt-2 flex items-center gap-2 rounded-full border border-purple-500/30 bg-zinc-950/80 px-4 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur">
        {refreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            <span>Atualizando...</span>
          </>
        ) : (
          <>
            <ArrowDown
              className={cn(
                "h-4 w-4 transition-transform",
                reached ? "rotate-180 text-purple-400" : "text-zinc-400"
              )}
            />
            <span>{reached ? "Solte para atualizar" : "Puxe para atualizar"}</span>
          </>
        )}
      </div>
    </div>
  );
}