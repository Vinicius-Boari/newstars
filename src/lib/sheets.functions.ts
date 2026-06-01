import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const MAX_SHEETS_PER_SYNC = 60;

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

async function gatewayFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...getConnectorHeaders(),
      ...init?.headers,
    },
  });
  const text = await response.text();
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
      url.searchParams.append("ranges", `${quoteSheetName(sheetName)}!A:J`);
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
        valueInputOption: "USER_ENTERED",
        data: [{ range: data.range, values: [[data.value]] }],
      }),
    });

    return { success: true };
  });