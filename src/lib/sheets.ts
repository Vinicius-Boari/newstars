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
  const headers = headerIndex !== -1 ? values[headerIndex].map(h => String(h).toUpperCase().trim()) : [];
  
  const getIdx = (name: string, fallback: number) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx !== -1 ? idx : fallback;
  };

  const idxData = getIdx("DATA", 0);
  const idxPedido = getIdx("PEDIDO", 1);
  const idxNome = getIdx("NOME", 2);
  const idxLocal = getIdx("LOCAL", 3);
  const idxTotal = getIdx("TOTAL", 4);
  const idxPct = getIdx("%", 5);
  const idxVlParc = getIdx("VL PARC", 6);
  const idxQtdParc = getIdx("QTD PARC", 7);
  const idxVenc = getIdx("VENC", 8);
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

export async function fetchSheetNames(sheetId: string, apiKey: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.sheets.map((s: any) => s.properties.title);
}

export async function fetchSheetValues(sheetId: string, sheetName: string, apiKey: string): Promise<any[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.values || [];
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
