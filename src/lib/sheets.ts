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
  rowIndex: number; // Row index in the sheet (1-based)
}

export interface QuinzenaData {
  quinzena: string;
  registros: Registro[];
  total: number;
  error?: string;
}

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toStr(v: any): string {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * Parses rows from Google Sheets API v4 (array of arrays)
 */
export function parseRows(values: any[][], quinzena: string): Registro[] {
  if (!values || values.length === 0) return [];

  // Dynamic header detection: search for a row that looks like a header
  // (contains "PEDIDO" and "NOME")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const rowStr = values[i].join("|").toUpperCase();
    if (rowStr.includes("PEDIDO") && rowStr.includes("NOME")) {
      headerIndex = i;
      break;
    }
  }

  // Use headers to find column indices
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
    .map((row): Registro | null => {
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
      };
    })
    .filter((r): r is Registro => r !== null);
}

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets";

export async function fetchSheetNames(sheetId: string, apiKey: string): Promise<string[]> {
  try {
    const isGateway = apiKey.startsWith("std_") || apiKey.includes("_API_KEY_");
    const url = isGateway 
      ? `${GATEWAY_URL}/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`
      : `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}&fields=sheets.properties.title`;
    
    const headers: Record<string, string> = {};
    if (isGateway) {
      headers["X-Connection-Api-Key"] = apiKey;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.sheets.map((s: any) => s.properties.title);
  } catch (error: any) {
    if (error.message?.includes("not be an Office file")) {
      throw new Error("A planilha fornecida não é um arquivo do Google Sheets (formato .xlsx não suportado via API). Por favor, abra o arquivo no Google Sheets e vá em 'Arquivo' > 'Salvar como Planilha Google'.");
    }
    throw error;
  }
}

export async function fetchSheetValues(sheetId: string, sheetName: string, apiKey: string): Promise<any[][]> {
  const isGateway = apiKey.startsWith("std_") || apiKey.includes("_API_KEY_");
  const url = isGateway
    ? `${GATEWAY_URL}/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`
    : `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
  
  const headers: Record<string, string> = {};
  if (isGateway) {
    headers["X-Connection-Api-Key"] = apiKey;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.values || [];
}

export async function updateSheetValue(sheetId: string, range: string, value: any, apiKey: string): Promise<void> {
  const isGateway = apiKey.startsWith("std_") || apiKey.includes("_API_KEY_");
  const url = isGateway
    ? `${GATEWAY_URL}/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
    : `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}&valueInputOption=USER_ENTERED`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isGateway) {
    headers["X-Connection-Api-Key"] = apiKey;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      values: [[value]],
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
}

export async function fetchAllSheets(sheetId: string, abas: string[], apiKey: string): Promise<QuinzenaData[]> {
  const results: QuinzenaData[] = [];
  for (const aba of abas) {
    try {
      const values = await fetchSheetValues(sheetId, aba, apiKey);
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

export function fmtPct(n: number): string {
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

// Extracts the current installment marked with parentheses, e.g. "30.(60).90" -> "60"
export function extractCurrentParc(qtd: string): { atual: string | null; partes: string[] } {
  if (!qtd) return { atual: null, partes: [] };
  const m = qtd.match(/\(([^)]+)\)/);
  const atual = m ? m[1] : null;
  const partes = qtd.split(/[.\s]/).filter(Boolean);
  return { atual, partes };
}

