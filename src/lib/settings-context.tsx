import * as React from "react";
import { DEFAULT_SHEET_ID } from "./sheets";

interface Settings {
  sheetId: string;
  excelUrl: string;
  connectorType: "google" | "microsoft";
  refreshMs: number;
  setSheetId: (id: string) => void;
  setExcelUrl: (url: string) => void;
  setConnectorType: (type: "google" | "microsoft") => void;
  setRefreshMs: (ms: number) => void;
}

const SettingsContext = React.createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheetId, setSheetId] = React.useState(DEFAULT_SHEET_ID);
  const [excelUrl, setExcelUrl] = React.useState("https://1drv.ms/x/c/63f6b82fdfc1daf6/IQDqCmJjTzIGR6nYTfVXU1KOAczfQQWvanYU_WH2wXhmzyM");
  const [connectorType, setConnectorType] = React.useState<"google" | "microsoft">("microsoft");
  const [refreshMs, setRefreshMs] = React.useState(60_000);

  return (
    <SettingsContext.Provider
      value={{
        sheetId,
        excelUrl,
        connectorType,
        refreshMs,
        setSheetId,
        setExcelUrl,
        setConnectorType,
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