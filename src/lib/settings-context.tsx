import * as React from "react";
import { DEFAULT_SHEET_ID } from "./sheets";

interface Settings {
  sheetId: string;
  apiKey: string;
  refreshMs: number;
  setSheetId: (id: string) => void;
  setApiKey: (key: string) => void;
  setRefreshMs: (ms: number) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const SettingsContext = React.createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [sheetId, setSheetId] = React.useState("186zpKURns1dm1ixv44RqYDbMfvVd3b4b");
  const [apiKey, setApiKey] = React.useState("AIzaSyBYD6W6p15o-I_pY_R3y9Q7w1jY8_4");
  const [refreshMs, setRefreshMs] = React.useState(30_000);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Load from localStorage only on client
  React.useEffect(() => {
    const savedId = localStorage.getItem("sheetId");
    const savedKey = localStorage.getItem("apiKey");
    const savedRefresh = localStorage.getItem("refreshMs");

    // Only override defaults if something was actually saved by the user
    if (savedId) setSheetId(savedId);
    if (savedKey && savedKey !== "AIzaSyBYD6W6p15o-I_pY_R3y9Q7w1jY8_8") setApiKey(savedKey);
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
        apiKey,
        refreshMs,
        setSheetId,
        setApiKey,
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
