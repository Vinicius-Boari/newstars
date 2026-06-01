import * as React from "react";
import { fetchSpreadsheet, type QuinzenaData } from "@/lib/sheets";
import { useSettings } from "@/lib/settings-context";
import { toast } from "sonner";

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
const MIN_REFRESH_MS = 90_000;
const CACHE_TTL_MS = 60_000;

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

  const running = inFlightSyncs.get(sheetId);
  if (running) return running;

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
      // No v4 API, adding a sheet requires a POST request with authentication.
      // Since we are likely using an API Key (read-only), we might not be able to write.
      // For now, let's just log or show a message.
      toast.info("A edição de abas deve ser feita diretamente no Google Sheets.");
    },
    removeAba: async (name: string) => {
      toast.info("A exclusão de abas deve ser feita diretamente no Google Sheets.");
    },
  };
}
