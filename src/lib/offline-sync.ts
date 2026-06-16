import { toast } from "sonner";

const PENDING_UPDATES_KEY = "sheets_pending_updates";
const DATA_CACHE_KEY = "sheets_data_cache";

interface PendingUpdate {
  id: string;
  sheetId: string;
  range: string;
  value: any;
  timestamp: number;
}

export function savePendingUpdate(sheetId: string, range: string, value: any) {
  const pending = getPendingUpdates();
  const update: PendingUpdate = {
    id: crypto.randomUUID(),
    sheetId,
    range,
    value,
    timestamp: Date.now(),
  };
  pending.push(update);
  localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(pending));
  
  if (!navigator.onLine) {
    toast.info("Sem internet. Alteração salva localmente e será enviada assim que houver conexão.");
  }
}

export function getPendingUpdates(): PendingUpdate[] {
  const stored = localStorage.getItem(PENDING_UPDATES_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function removePendingUpdate(id: string) {
  const pending = getPendingUpdates().filter(u => u.id !== id);
  localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(pending));
}

export async function syncPendingUpdates(updateFn: (sheetId: string, range: string, value: any) => Promise<void>) {
  const pending = getPendingUpdates();
  if (pending.length === 0) return;

  toast.loading(`Sincronizando ${pending.length} alterações pendentes...`, { id: "sync-toast" });

  let successCount = 0;
  for (const update of pending) {
    try {
      await updateFn(update.sheetId, update.range, update.value);
      removePendingUpdate(update.id);
      successCount++;
    } catch (error) {
      console.error("Erro ao sincronizar atualização pendente:", error);
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} alterações sincronizadas com sucesso!`, { id: "sync-toast" });
  } else {
    toast.dismiss("sync-toast");
  }
}

// =========================
// Cache local dos dados (modo offline)
// =========================

interface CachedSheetData<T> {
  sheetId: string;
  data: T;
  timestamp: number;
}

export function saveCachedData<T>(sheetId: string, data: T) {
  try {
    const payload: CachedSheetData<T> = { sheetId, data, timestamp: Date.now() };
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[offline-sync] Falha ao salvar cache local:", err);
  }
}

export function getCachedData<T>(sheetId: string): { data: T; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSheetData<T>;
    if (parsed.sheetId !== sheetId) return null;
    return { data: parsed.data, timestamp: parsed.timestamp };
  } catch {
    return null;
  }
}

export function clearCachedData() {
  localStorage.removeItem(DATA_CACHE_KEY);
}

// Dispara um callback sempre que a conexão voltar.
// Retorna função para remover o listener.
export function onReconnect(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapped = () => {
    toast.success("Conexão restabelecida. Sincronizando...", { duration: 2500 });
    handler();
  };
  window.addEventListener("online", wrapped);
  return () => window.removeEventListener("online", wrapped);
}
