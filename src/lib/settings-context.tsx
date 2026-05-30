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
  const [sheetId, setSheetId] = React.useState("186zpKURns1dm1ixv44RqYDbMfvVd3b4b");
  const [excelUrl, setExcelUrl] = React.useState("https://1drv.ms/x/c/63f6b82fdfc1daf6/IQDqCmJjTzIGR6nYTfVXU1KOAczfQQWvanYU_WH2wXhmzyM?e=K7EDdZ&nav=MTVfezU3ODNFMjc5LUJCRUYtNDgzQi05QkFDLTA2QkVCRUREMTM3Mn0");

  const [connectorType, setConnectorType] = React.useState<"google" | "microsoft">("google");
  const [refreshMs, setRefreshMs] = React.useState(30_000);

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