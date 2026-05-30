import { Registro } from "./sheets";

// Configurações da planilha Excel no OneDrive
export const EXCEL_FILE_ID = "63F6B82FDFC1DAF6!3118"; 
export const DRIVE_ID = "63f6b82fdfc1daf6";

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchExcelData(abas: string[]): Promise<{ quinzena: string; registros: Registro[]; total: number; error?: string }[]> {
  console.log("Iniciando busca de dados do Excel via Microsoft Graph...");
  
  const results = await Promise.all(
    abas.map(async (aba) => {
      try {
        const range = "A1:J500"; 
        // URL format for Microsoft Graph to access a worksheet range
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${EXCEL_FILE_ID}/workbook/worksheets('${aba}')/range(address='${range}')`;
        
        console.log(`Buscando aba: ${aba}`);
        const res = await fetch(url);
        
        if (!res.ok) {
          const errText = await res.text();
          console.error(`Erro na aba ${aba}:`, res.status, errText);
          let message = `Erro ${res.status}`;
          try {
            const errJson = JSON.parse(errText);
            message = errJson.error?.message || message;
          } catch (e) {}
          throw new Error(message);
        }
        
        const data = await res.json();
        const rows = data.values as any[][];
        
        if (!rows || rows.length < 3) {
          return { quinzena: aba, registros: [], total: 0 };
        }

        const registros = rows.slice(2).map((row): Registro | null => {
          const nome = String(row[2] || "").trim();
          if (!nome) return null;
          
          return {
            quinzena: aba,
            data: String(row[0] || ""),
            pedido: String(row[1] || ""),
            nome,
            local: String(row[3] || ""),
            total: toNumber(row[4]),
            pct: toNumber(row[5]),
            vlParc: toNumber(row[6]),
            qtdParc: String(row[7] || ""),
            venc: String(row[8] || ""),
            receber: toNumber(row[9]),
          };
        }).filter((r): r is Registro => r !== null);

        const total = registros.reduce((s, r) => s + r.receber, 0);
        console.log(`Sucesso na aba ${aba}: ${registros.length} registros`);
        return { quinzena: aba, registros, total };
      } catch (e) {
        console.error(`Falha crítica na aba ${aba}:`, e);
        return { 
          quinzena: aba, 
          registros: [], 
          total: 0, 
          error: e instanceof Error ? e.message : "Erro na conexão com Excel" 
        };
      }
    })
  );

  return results;
}


