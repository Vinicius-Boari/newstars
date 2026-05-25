export const DEFAULT_SHEET_ID = "18y8D7O10G3N_kU-4YqB2N3jL9vE8pS0R";

export const ABAS = [
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

export type Quinzena = (typeof ABAS)[number];

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

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toStr(v: unknown, f?: string | null): string {
  if (f) return f;
  if (v == null) return "";
  return String(v);
}

interface GVizCell {
  v?: unknown;
  f?: string | null;
}
interface GVizRow {
  c: (GVizCell | null)[];
}
interface GVizJson {
  table: { rows: GVizRow[] };
}

async function fetchSheet(sheetId: string, sheetName: string): Promise<GVizJson> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
    sheetName,
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // The gviz response is wrapped in `google.visualization.Query.setResponse(...);`
  if (text.includes("errorMessage") && text.includes("too large")) {
    throw new Error(
      "O arquivo é um Excel (.xlsx). No Google Sheets, vá em 'Arquivo' > 'Salvar como Planilhas Google'.",
    );
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(
      "Planilha não está pública ou formato inválido. Compartilhe como 'Qualquer pessoa com o link → Visualizador' e certifique-se de que é uma Planilha Google (não .xlsx).",
    );
  }
  try {
    return JSON.parse(text.substring(start, end + 1)) as GVizJson;
  } catch {
    throw new Error("Falha ao processar resposta da planilha.");
  }
}

function parseRows(json: GVizJson, quinzena: string): Registro[] {
  const rows = json.table?.rows ?? [];
  if (rows.length < 2) return [];
  return rows
    .slice(2)
    .map((row): Registro | null => {
      const c = row?.c ?? [];
      const get = (i: number): GVizCell | null => c[i] ?? null;
      const nome = toStr(get(2)?.v, get(2)?.f).trim();
      if (!nome) return null;
      return {
        quinzena,
        data: toStr(get(0)?.v, get(0)?.f),
        pedido: toStr(get(1)?.v, get(1)?.f),
        nome,
        local: toStr(get(3)?.v, get(3)?.f),
        total: toNumber(get(4)?.f ?? get(4)?.v),
        pct: toNumber(get(5)?.f ?? get(5)?.v),
        vlParc: toNumber(get(6)?.f ?? get(6)?.v),
        qtdParc: toStr(get(7)?.v, get(7)?.f),
        venc: toStr(get(8)?.v, get(8)?.f),
        receber: toNumber(get(9)?.f ?? get(9)?.v),
      };
    })
    .filter((r): r is Registro => r !== null);
}

export interface QuinzenaData {
  quinzena: string;
  registros: Registro[];
  total: number;
  error?: string;
}

export async function fetchAllSheets(sheetId: string): Promise<QuinzenaData[]> {
  const results = await Promise.all(
    ABAS.map(async (aba): Promise<QuinzenaData> => {
      try {
        const json = await fetchSheet(sheetId, aba);
        const registros = parseRows(json, aba);
        const total = registros.reduce((s, r) => s + r.receber, 0);
        return { quinzena: aba, registros, total };
      } catch (e) {
        return {
          quinzena: aba,
          registros: [],
          total: 0,
          error: e instanceof Error ? e.message : "Erro desconhecido",
        };
      }
    }),
  );
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