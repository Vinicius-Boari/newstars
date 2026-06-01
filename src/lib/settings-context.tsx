import * as React from "react";
import { DEFAULT_SHEET_ID } from "./sheets";

interface Settings {
  sheetId: string;
  refreshMs: number;
  setSheetId: (id: string) => void;
  setRefreshMs: (ms: number) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const SettingsContext = React.createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheetId, setSheetId] = React.useState(DEFAULT_SHEET_ID);
  const [apiKey, setApiKey] = React.useState("GOOGLE_SHEETS_API_KEY_1"); // Mantido interno para o Connector
  const [refreshMs, setRefreshMs] = React.useState(30_000);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Load from localStorage only on client
  React.useEffect(() => {
    const savedId = localStorage.getItem("sheetId");
    const savedKey = localStorage.getItem("apiKey");
    const savedRefresh = localStorage.getItem("refreshMs");

    // Limpa ID antigo (planilha que não existe mais) para forçar uso do DEFAULT
    if (savedId === "186zpKURns1dm1ixv44RqYDbMfvVd3b4b") {
      localStorage.removeItem("sheetId");
      return;
    }

    // Only override defaults if something was actually saved by the user
    if (savedId) setSheetId(savedId);
    if (savedKey && savedKey.length > 5) setApiKey(savedKey);
    if (savedRefresh) setRefreshMs(Number(savedRefresh));
  }, []);

  // Save to localStorage on change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sheetId", sheetId);
      localStorage.setItem("apiKey", apiKey);
      localStorage.setItem("refreshMs", String(refreshMs));
    }
  }, [sheetId, apiKey, refreshMs]);

  return (
    <SettingsContext.Provider
      value={{
        sheetId,
        refreshMs,
        setSheetId,
        setRefreshMs,
        isSettingsOpen,
        setIsSettingsOpen,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
