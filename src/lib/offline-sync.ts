import { toast } from "sonner";

const PENDING_UPDATES_KEY = "sheets_pending_updates";

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
