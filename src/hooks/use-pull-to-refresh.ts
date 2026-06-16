import * as React from "react";

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number;       // px que o usuário precisa puxar
  maxPull?: number;         // limite visual do "stretch"
  disabled?: boolean;
}

/**
 * Pull-to-refresh para o scroll da janela. Só dispara quando o usuário
 * está no topo da página (window.scrollY === 0) e puxa para baixo com
 * o dedo (touch). Em desktop é inerte.
 */
export function usePullToRefresh({ onRefresh, threshold = 70, maxPull = 120, disabled = false }: Options) {
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const tracking = React.useRef(false);

  React.useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // resistência: amortece o gesto
      const resisted = Math.min(maxPull, delta * 0.5);
      setPull(resisted);
      if (delta > 10) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!tracking.current) return;
      tracking.current = false;
      const reached = pull >= threshold;
      if (reached) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, threshold, maxPull, disabled, pull, refreshing]);

  return { pull, refreshing, threshold };
}