import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const MAX_SHEETS_PER_SYNC = 60;

const sheetNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[^\x00-\x1f/?&#]+$/, "Nome de aba inválido.");

const spreadsheetSchema = z.object({
  sheetId: z
    .string()
    .min(20)
    .max(250)
    .transform((value) => {
      const match = value.match(/\/spreadsheets\/d\/([^/]+)/);
      return (match?.[1] ?? value).trim();
    })
    .pipe(z.string().regex(/^[A-Za-z0-9_-]{20,140}$/, "ID da planilha inválido.")),
  sheetNames: z.array(z.string().min(1).max(100)).max(MAX_SHEETS_PER_SYNC).optional(),
});

const updateSchema = z.object({
  sheetId: spreadsheetSchema.shape.sheetId,
  range: z.string().min(3).max(180),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

const createSheetSchema = z.object({
  sheetId: spreadsheetSchema.shape.sheetId,
  title: z.string().min(1).max(100),
});

const appendPedidoSchema = z.object({
  sheetId: spreadsheetSchema.shape.sheetId,
  quinzena: sheetNameSchema,
  values: z.array(z.any()),
});

const deletePedidoSchema = z.object({
  sheetId: spreadsheetSchema.shape.sheetId,
  quinzena: sheetNameSchema,
  rowIndex: z.number(),
});

const transferPedidoSchema = z.object({
  sheetId: spreadsheetSchema.shape.sheetId,
  fromQuinzena: sheetNameSchema,
  toQuinzena: sheetNameSchema,
  rowIndex: z.number(),
  registroData: z.array(z.any()),
});

function getConnectorHeaders() {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_SHEETS_API_KEY_1 ?? process.env.GOOGLE_SHEETS_API_KEY;

  if (!lovableApiKey) throw new Error("Connector sem LOVABLE_API_KEY configurada.");
  if (!connectionKey) throw new Error("Connector do Google Sheets não está vinculado ao projeto.");

  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionKey,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function quoteSheetName(name: string) {
  return /^[A-Za-z0-9_]+$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

function encodeSheetSegment(name: string) {
  return encodeURIComponent(quoteSheetName(name));
}

function rowHasValue(row: unknown[] | undefined) {
  return Boolean(row?.some((cell) => cell != null && String(cell).trim() !== ""));
}

async function gatewayFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const maxAttempts = 4;
  let response!: Response;
  let text = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    response = await fetch(url, {
      ...init,
      headers: {
        ...getConnectorHeaders(),
        ...init?.headers,
      },
    });
    text = await response.text();
    if (response.ok) break;
    const retriable = response.status === 429 || response.status >= 500 || text.includes("Quota exceeded") || text.includes("upstream");
    if (!retriable || attempt === maxAttempts) break;
    const delay = Math.min(8000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 300);
    await new Promise((r) => setTimeout(r, delay));
  }
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: { message: text.slice(0, 200) } };
    }
  }

  if (!response.ok) {
    const upstreamMessage = payload?.error?.message ?? payload?.error ?? payload?.message ?? text;
    if (String(upstreamMessage).includes("Office file")) {
      throw new Error("O arquivo selecionado é Excel (.xlsx). Abra no Google Drive e salve como Planilha Google antes de sincronizar.");
    }
    if (response.status === 429 || String(upstreamMessage).includes("Quota exceeded")) {
      throw new Error("Limite temporário do Google Sheets atingido. Aguarde cerca de 1 minuto e tente sincronizar novamente.");
    }
    if (response.status >= 500 || String(upstreamMessage).includes("upstream")) {
      throw new Error("Serviço do Google Sheets temporariamente indisponível. Tente novamente em alguns segundos.");
    }
    throw new Error(`Falha no Connector Google Sheets (${response.status}): ${upstreamMessage}`);
  }

  return payload as T;
}

export const fetchSpreadsheetData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => spreadsheetSchema.parse(input))
  .handler(async ({ data }) => {
    let sheetNames = data.sheetNames?.filter(Boolean) ?? [];

    if (sheetNames.length === 0) {
      const metadata = await gatewayFetch<{ sheets?: Array<{ properties?: { title?: string } }> }>(
        `${GATEWAY_URL}/spreadsheets/${data.sheetId}?fields=sheets.properties.title`,
      );
      sheetNames = (metadata.sheets ?? [])
        .map((sheet) => sheet.properties?.title)
        .filter((title): title is string => Boolean(title))
        .slice(0, MAX_SHEETS_PER_SYNC);
    }

    if (sheetNames.length === 0) return { sheetNames: [], valuesBySheet: {} as Record<string, any[][]> };

    const url = new URL(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values:batchGet`);
    for (const sheetName of sheetNames) {
      url.searchParams.append("ranges", `${quoteSheetName(sheetName)}!A:Z`);
    }

    const values = await gatewayFetch<{ valueRanges?: Array<{ values?: any[][] }> }>(url.toString());
    const valuesBySheet = sheetNames.reduce<Record<string, any[][]>>((acc, sheetName, index) => {
      acc[sheetName] = values.valueRanges?.[index]?.values ?? [];
      return acc;
    }, {});

    return { sheetNames, valuesBySheet };
  });

export const updateSpreadsheetCell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data }) => {
    await gatewayFetch(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: [{ range: data.range, values: [[data.value]] }],
      }),
    });

    return { success: true };
  });

export const createSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSheetSchema.parse(input))
  .handler(async ({ data }) => {
    // 1. Create the sheet
    await gatewayFetch(`${GATEWAY_URL}/spreadsheets/${data.sheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: data.title,
              },
            },
          },
        ],
      }),
    });

    // 2. Add headers to the new sheet
    const headers = [
      "DATA", "PEDIDO", "NOME", "LOCAL", "TOTAL", "PCT", "VL PARC", "QTD PARC", "VENC", "RECEBER", "PAGO"
    ];

    await gatewayFetch(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values/${encodeSheetSegment(data.title)}!A1:K1?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({
        values: [headers],
      }),
    });

    return { success: true };
  });

export const transferPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => transferPedidoSchema.parse(input))
  .handler(async ({ data }) => {
    // 1. Clear the old row (we don't DELETE because that shifts rows and can break logic, 
    // but clear is usually safer for Sheets-as-DB unless we want a full row shift)
    // Actually, to "move" we should append to target and clear source.
    
    // Append to toQuinzena
    await gatewayFetch(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values/${encodeSheetSegment(data.toQuinzena)}!A:A:append?valueInputOption=RAW`, {
      method: "POST",
      body: JSON.stringify({
        values: [data.registroData],
      }),
    });

    // Clear from fromQuinzena
    const range = `${encodeSheetSegment(data.fromQuinzena)}!A${data.rowIndex}:K${data.rowIndex}`;
    await gatewayFetch(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values/${range}:clear`, {
      method: "POST",
    });

    return { success: true };
  });

export const appendPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => appendPedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const appendRange = `${quoteSheetName(data.quinzena)}!A:K`;
    const current = await gatewayFetch<{ values?: unknown[][] }>(
      `${GATEWAY_URL}/spreadsheets/${data.sheetId}/values/${appendRange}`,
    );
    const rows = current.values ?? [];
    let lastNonEmptyRow = rows.length;
    while (lastNonEmptyRow > 0 && !rowHasValue(rows[lastNonEmptyRow - 1])) {
      lastNonEmptyRow -= 1;
    }

    const targetRow = Math.max(lastNonEmptyRow + 1, 2);
    const targetRange = `${quoteSheetName(data.quinzena)}!A${targetRow}:K${targetRow}`;
    const result = await gatewayFetch<{ updatedRows?: number; updatedCells?: number; updatedRange?: string }>(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values/${targetRange}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({
        values: [data.values],
      }),
    });

    const updatedRows = result.updatedRows ?? 0;
    const updatedCells = result.updatedCells ?? 0;
    if (updatedRows < 1 || updatedCells < data.values.length) {
      throw new Error("O Google Sheets respondeu sem confirmar a inclusão do pedido. Confira a aba selecionada e tente novamente.");
    }

    return { success: true, updatedRange: result.updatedRange ?? targetRange };
  });

export const deletePedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deletePedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const range = `${encodeSheetSegment(data.quinzena)}!A${data.rowIndex}:J${data.rowIndex}`;
    await gatewayFetch(`${GATEWAY_URL}/spreadsheets/${data.sheetId}/values/${range}:clear`, {
      method: "POST",
    });

    return { success: true };
  });