import * as React from "react";
import { DEFAULT_SHEET_ID } from "./sheets";

interface Settings {
  sheetId: string;
  refreshMs: number;
  setSheetId: (id: string) => void;
  setRefreshMs: (ms: number) => void;
}

const SettingsContext = React.createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheetId, setSheetId] = React.useState(DEFAULT_SHEET_ID);
  const [refreshMs, setRefreshMs] = React.useState(60_000);
  return (
    <SettingsContext.Provider value={{ sheetId, refreshMs, setSheetId, setRefreshMs }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}