import * as React from "react";
import { fetchSpreadsheet, createSheet, type QuinzenaData } from "@/lib/sheets";
import { useSettings } from "@/lib/settings-context";
import { toast } from "sonner";
import { saveCachedData, getCachedData, onReconnect } from "@/lib/offline-sync";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SheetsDataResult {
  data: QuinzenaData[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string | null;
  lastUpdated: string | null;
  syncStatus: SyncStatus;
  refetch: () => Promise<void>;
  addAba: (name: string) => Promise<void>;
  removeAba: (name: string) => Promise<void>;
}

const DEFAULT_ID = "1O6ImCfLvgxJF7LiSEFLc9qphD7z0ZpUPii947HCSPGg";
const MIN_REFRESH_MS = 60_000;
const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  data: QuinzenaData[];
  timestamp: number;
};

const sheetCache = new Map<string, CacheEntry>();
const inFlightSyncs = new Map<string, Promise<QuinzenaData[]>>();

async function loadSpreadsheetWithCache(sheetId: string, force = false) {
  const now = Date.now();
  const cached = sheetCache.get(sheetId);
  if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Quando force=true (após criar/editar/excluir pedido), NUNCA reaproveite
  // uma requisição em vôo — ela pode ter começado antes da escrita e
  // retornaria dados desatualizados, fazendo o novo pedido "sumir".
  if (!force) {
    const running = inFlightSyncs.get(sheetId);
    if (running) return running;
  }

  const request = fetchSpreadsheet(sheetId)
    .then((result) => {
      sheetCache.set(sheetId, { data: result, timestamp: Date.now() });
      return result;
    })
    .finally(() => inFlightSyncs.delete(sheetId));

  inFlightSyncs.set(sheetId, request);
  return request;
}

export function useSheetsData(): SheetsDataResult {
  const { sheetId, refreshMs } = useSettings();
  const [data, setData] = React.useState<QuinzenaData[] | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(false);

  const effectiveSheetId = sheetId || DEFAULT_ID;

  // Hidrata a partir do cache local — exibe algo imediatamente, mesmo offline.
  React.useEffect(() => {
    const cached = getCachedData<QuinzenaData[]>(effectiveSheetId);
    if (cached) {
      setData(cached.data);
      setLastUpdated(new Date(cached.timestamp).toLocaleTimeString());
      setIsInitialLoading(false);
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.info("Você está offline. Mostrando dados em cache.", { duration: 3000 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSheetId]);

  const sync = React.useCallback(async (isBackground = false, force = false) => {
    if (!effectiveSheetId) {
      setError("ID da planilha não configurado.");
      setSyncStatus("error");
      setIsInitialLoading(false);
      return;
    }

    try {
      if (!isBackground) setIsInitialLoading(data === undefined);
      setIsFetching(true);
      setSyncStatus("syncing");

      const newData = await loadSpreadsheetWithCache(effectiveSheetId, force);

      // 3. Comparar para evitar re-renders desnecessários
      const hasChanged = JSON.stringify(data) !== JSON.stringify(newData);
      
      if (hasChanged) {
        setData(newData);
        if (isBackground && data !== undefined) {
          toast.success("✨ Dados atualizados", { duration: 2000 });
        }
      }

      saveCachedData(effectiveSheetId, newData);
      setLastUpdated(new Date().toLocaleTimeString());
      setSyncStatus("success");
      setError(null);
    } catch (err: any) {
      console.error("[Sync Error]", err);
      setError(err.message || "Erro na sincronização");
      setSyncStatus("error");
    } finally {
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [effectiveSheetId, data]);

  React.useEffect(() => {
    sync();

    const safeRefreshMs = Math.max(refreshMs, MIN_REFRESH_MS);
    const intervalId = setInterval(() => {
      sync(true);
    }, safeRefreshMs);

    return () => clearInterval(intervalId);
  }, [sync, refreshMs]);

  // Sincroniza assim que a conexão voltar.
  React.useEffect(() => {
    return onReconnect(() => sync(true, true));
  }, [sync]);

  return {
    data,
    isLoading: isInitialLoading,
    isFetching,
    isError: syncStatus === "error",
    error,
    lastUpdated,
    syncStatus,
    refetch: () => sync(false, true),
    addAba: async (name: string) => {
      try {
        setIsFetching(true);
        setSyncStatus("syncing");
        await createSheet({ data: { sheetId: effectiveSheetId, title: name } });
        toast.success(`Aba "${name}" criada com sucesso no Google Sheets!`);
        await sync(false, true); // Refresh data to show new tab
      } catch (err: any) {
        console.error("[Add Aba Error]", err);
        toast.error("Erro ao criar aba: " + err.message);
      } finally {
        setIsFetching(false);
      }
    },
    removeAba: async (name: string) => {
      toast.info("A exclusão de abas deve ser feita diretamente no Google Sheets.");
    },
  };
}
