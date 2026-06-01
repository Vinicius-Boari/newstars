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
  const [refreshMs, setRefreshMsState] = React.useState(90_000);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const updateSheetId = React.useCallback((value: string) => {
    const match = value.match(/\/spreadsheets\/d\/([^/]+)/);
    setSheetId((match?.[1] ?? value).trim());
  }, []);

  const setRefreshMs = React.useCallback((ms: number) => {
    setRefreshMsState(Math.max(90_000, Number.isFinite(ms) ? ms : 90_000));
  }, []);

  // Load from localStorage only on client
  React.useEffect(() => {
    const savedId = localStorage.getItem("sheetId");
    const savedRefresh = localStorage.getItem("refreshMs");

    // Limpa IDs antigos (planilha Excel ou ID inválido) para forçar uso do novo DEFAULT
    const oldIds = ["186zpKURns1dm1ixv44RqYDbMfvVd3b4b", "1b3IzfKyMXivpz4klzZy0eoa4eQeQFHBt"];
    if (savedId && oldIds.includes(savedId)) {
      localStorage.removeItem("sheetId");
      return;
    }

    // Only override defaults if something was actually saved by the user
    if (savedId) updateSheetId(savedId);
    if (savedRefresh) setRefreshMs(Number(savedRefresh));
  }, []);

  // Save to localStorage on change
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sheetId", sheetId);
      localStorage.setItem("refreshMs", String(refreshMs));
    }
  }, [sheetId, refreshMs]);

  return (
    <SettingsContext.Provider
      value={{
        sheetId,
        refreshMs,
        setSheetId: updateSheetId,
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
