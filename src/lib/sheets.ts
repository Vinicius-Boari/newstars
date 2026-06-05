import { fetchSpreadsheetData, updateSpreadsheetCell as updateSpreadsheetCellFn } from "./sheets.functions";

export const DEFAULT_SHEET_ID = "1O6ImCfLvgxJF7LiSEFLc9qphD7z0ZpUPii947HCSPGg";

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

export async function fetchSheetNames(sheetId: string): Promise<string[]> {
  const data = await fetchSpreadsheetData({ data: { sheetId } });
  return data.sheetNames;
}

export async function fetchSheetValues(sheetId: string, sheetName: string): Promise<any[][]> {
  const data = await fetchSpreadsheetData({ data: { sheetId, sheetNames: [sheetName] } });
  return data.valuesBySheet[sheetName] || [];
}

export async function updateSheetValue(sheetId: string, range: string, value: any): Promise<void> {
  await updateSpreadsheetCell({ data: { sheetId, range, value } });
}
export const updateSpreadsheetCell = updateSpreadsheetCellFn;

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
  
  const getIdx = (names: string[], fallback: number) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const idxData = getIdx(["DATA"], 0);
  const idxPedido = getIdx(["PEDIDO"], 1);
  const idxNome = getIdx(["NOME", "CLIENTE"], 2);
  const idxLocal = getIdx(["LOCAL", "CIDADE"], 3);
  const idxTotal = getIdx(["VALOR PEDIDO", "TOTAL", "VALOR"], 4);
  const idxPct = getIdx(["COMISSAO %", "PCT", "%"], 5);
  const idxVlParc = getIdx(["VALOR PARC", "VL PARC", "PARCELA"], 6);
  const idxQtdParc = getIdx(["QTD PARC", "PARCELAS", "QTD"], 7);
  const idxVenc = getIdx(["VENCIMENTO", "VENC"], 8);
  const idxReceber = getIdx(["RECEBER", "A RECEBER"], 9);

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
        receber: toNumber(row[idxReceber]) || (toNumber(row[idxVlParc]) * (toNumber(row[idxPct]) / 100)) || 0,
        rowIndex: startRow + i + 1,
      };
    })
    .filter((r): r is Registro => r !== null);
}

export async function fetchAllSheets(sheetId: string, abas: string[]): Promise<QuinzenaData[]> {
  const data = await fetchSpreadsheetData({ data: { sheetId, sheetNames: abas } });
  return data.sheetNames.map((aba) => {
    const registros = parseRows(data.valuesBySheet[aba] || [], aba);
    const total = registros.reduce((s, r) => s + r.receber, 0);
    return { quinzena: aba, registros, total };
  });
}

export async function fetchSpreadsheet(sheetId: string): Promise<QuinzenaData[]> {
  const data = await fetchSpreadsheetData({ data: { sheetId } });
  return data.sheetNames.map((aba) => {
    const registros = parseRows(data.valuesBySheet[aba] || [], aba);
    const total = registros.reduce((s, r) => s + r.receber, 0);
    return { quinzena: aba, registros, total };
  });
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
