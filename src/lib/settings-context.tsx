import * as React from "react";
import { DEFAULT_SHEET_ID } from "./sheets";

interface Settings {
  sheetId: string;
  apiKey: string;
  refreshMs: number;
  setSheetId: (id: string) => void;
  setApiKey: (key: string) => void;
  setRefreshMs: (ms: number) => void;
}

const SettingsContext = React.createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheetId, setSheetId] = React.useState(localStorage.getItem("sheetId") || "186zpKURns1dm1ixv44RqYDbMfvVd3b4b");
  const [apiKey, setApiKey] = React.useState(localStorage.getItem("apiKey") || "");
  const [refreshMs, setRefreshMs] = React.useState(Number(localStorage.getItem("refreshMs")) || 30_000);

  React.useEffect(() => {
    localStorage.setItem("sheetId", sheetId);
    localStorage.setItem("apiKey", apiKey);
    localStorage.setItem("refreshMs", String(refreshMs));
  }, [sheetId, apiKey, refreshMs]);

  return (
    <SettingsContext.Provider
      value={{
        sheetId,
        apiKey,
        refreshMs,
        setSheetId,
        setApiKey,
        setRefreshMs,
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