import { supabase } from "@/integrations/supabase/client";

// Simple fetch wrapper to handle errors
async function safeFetch(url: string, options: RequestInit) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    
    if (!res.ok) {
      console.error(`Fetch error ${res.status}:`, text);
      try {
        const error = JSON.parse(text);
        throw new Error(error.error?.message || `Erro ${res.status}`);
      } catch {
        throw new Error(`Erro na conexão: ${res.status}`);
      }
    }
    
    return JSON.parse(text);
  } catch (err: any) {
    console.error("safeFetch critical error:", err);
    throw err;
  }
}

export const DEFAULT_SHEET_ID = "186zpKURns1dm1ixv44RqYDbMfvVd3b4b";

export interface Registro {
  quinzena: string;
  data: string;
  pedido: string;
  nome: string;
  local: string;
  total: number;
  pct: number;
  vlParc: number;
  qtdParc: string;
  venc: string;
  receber: number;
  rowIndex: number;
}

export interface QuinzenaData {
  quinzena: string;
  registros: Registro[];
  total: number;
  error?: string;
}

export const COL_INDICES = {
  DATA: 0,
  PEDIDO: 1,
  NOME: 2,
  LOCAL: 3,
  TOTAL: 4,
  PCT: 5,
  VL_PARC: 6,
  QTD_PARC: 7,
  VENC: 8,
  RECEBER: 9
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets";

export async function fetchSheetNames(sheetId: string): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const url = `${GATEWAY_URL}/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
  const data = await safeFetch(url, {
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": "GOOGLE_SHEETS_API_KEY_1",
      "Accept": "application/json",
    }
  });

  return data.sheets.map((s: any) => s.properties.title);
}

export async function fetchSheetValues(sheetId: string, sheetName: string): Promise<any[][]> {
  const url = `${GATEWAY_URL}/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`;
  const data = await safeFetch(url, {
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": "GOOGLE_SHEETS_API_KEY_1",
      "Accept": "application/json",
    }
  });

  return data.values || [];
}

export async function updateSheetValue(sheetId: string, range: string, value: any): Promise<void> {
  const url = `${GATEWAY_URL}/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  await safeFetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": "GOOGLE_SHEETS_API_KEY_1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[value]],
    }),
  });
}

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toStr(v: any): string {
  return v == null ? "" : String(v).trim();
}

export function parseRows(values: any[][], quinzena: string): Registro[] {
  if (!values || values.length === 0) return [];

  let headerIndex = -1;
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const rowStr = values[i].join("|").toUpperCase();
    if (rowStr.includes("PEDIDO") && rowStr.includes("NOME")) {
      headerIndex = i;
      break;
    }
  }

  const rowWithHeaders = headerIndex !== -1 ? values[headerIndex] : values[0] || [];
  const headers = rowWithHeaders.map(h => String(h).toUpperCase().trim());
  
  const getIdx = (name: string, fallback: number) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx !== -1 ? idx : fallback;
  };

  const idxData = getIdx("DATA", 0);
  const idxPedido = getIdx("PEDIDO", 1);
  const idxNome = getIdx("NOME", 2);
  const idxLocal = getIdx("LOCAL", 3);
  const idxTotal = getIdx("VALOR PEDIDO", 4);
  const idxPct = getIdx("COMISSAO %", 5);
  const idxVlParc = getIdx("VALOR PARC", 6);
  const idxQtdParc = getIdx("QTD PARC", 7);
  const idxVenc = getIdx("VENCIMENTO", 8);
  const idxReceber = getIdx("RECEBER", 9);

  const startRow = headerIndex !== -1 ? headerIndex + 1 : 1;

  return values
    .slice(startRow)
    .map((row, i): Registro | null => {
      const nome = toStr(row[idxNome]);
      if (!nome) return null;

      return {
        quinzena,
        data: toStr(row[idxData]),
        pedido: toStr(row[idxPedido]),
        nome,
        local: toStr(row[idxLocal]),
        total: toNumber(row[idxTotal]),
        pct: toNumber(row[idxPct]),
        vlParc: toNumber(row[idxVlParc]),
        qtdParc: toStr(row[idxQtdParc]),
        venc: toStr(row[idxVenc]),
        receber: toNumber(row[idxReceber]),
        rowIndex: startRow + i + 1,
      };
    })
    .filter((r): r is Registro => r !== null);
}

export async function fetchAllSheets(sheetId: string, abas: string[]): Promise<QuinzenaData[]> {
  const results: QuinzenaData[] = [];
  for (const aba of abas) {
    try {
      const values = await fetchSheetValues(sheetId, aba);
      const registros = parseRows(values, aba);
      const total = registros.reduce((s, r) => s + r.receber, 0);
      results.push({ quinzena: aba, registros, total });
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (e) {
      results.push({
        quinzena: aba,
        registros: [],
        total: 0,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      });
    }
  }
  return results;
}

export function fmtMoney(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function extractCurrentParc(qtd: string): { atual: string | null; partes: string[] } {
  if (!qtd) return { atual: null, partes: [] };
  const m = qtd.match(/\(([^)]+)\)/);
  const atual = m ? m[1] : null;
  const partes = qtd.split(/[.\s]/).filter(Boolean);
  return { atual, partes };
}