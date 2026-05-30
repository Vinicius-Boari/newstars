import * as React from "react";
import { fetchAllSheets, fetchSheetNames, type QuinzenaData } from "@/lib/sheets";
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

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || "";
const DEFAULT_ID = import.meta.env.VITE_SPREADSHEET_ID || "";

export function useSheetsData(): SheetsDataResult {
  const { sheetId, refreshMs } = useSettings();
  const [data, setData] = React.useState<QuinzenaData[] | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isFetching, setIsFetching] = React.useState(false);

  const effectiveSheetId = sheetId || DEFAULT_ID;

  const sync = React.useCallback(async (isBackground = false) => {
    if (!API_KEY) {
      setError("Google Sheets API Key não configurada no .env (VITE_GOOGLE_SHEETS_API_KEY)");
      setSyncStatus("error");
      setIsInitialLoading(false);
      return;
    }

    if (!effectiveSheetId) {
      setError("ID da planilha não configurado (VITE_SPREADSHEET_ID)");
      setSyncStatus("error");
      setIsInitialLoading(false);
      return;
    }


    try {
      if (!isBackground) setIsInitialLoading(data === undefined);
      setIsFetching(true);
      setSyncStatus("syncing");

      // 1. Buscar nomes das abas dinamicamente
      const sheetNames = await fetchSheetNames(effectiveSheetId, API_KEY);
      
      // 2. Buscar dados de todas as abas
      const newData = await fetchAllSheets(effectiveSheetId, sheetNames, API_KEY);

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
      // Manteḿ os dados anteriores em caso de erro
    } finally {
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [effectiveSheetId, data]);

  React.useEffect(() => {
    // Carga inicial imediata
    sync();

    // Polling a cada X segundos (padrão 30s)
    const intervalId = setInterval(() => {
      sync(true);
    }, refreshMs);

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
    refetch: () => sync(),
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
