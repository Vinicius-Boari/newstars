import { ABAS, Registro } from "./sheets";

// Configurações da planilha Excel no OneDrive
export const EXCEL_FILE_ID = "63F6B82FDFC1DAF6!3011"; // ID extraído do link original
export const DRIVE_ID = "63f6b82fdfc1daf6";

interface ExcelRow {
  values: any[][];
}

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchExcelData(): Promise<{ quinzena: string; registros: Registro[]; total: number; error?: string }[]> {
  // Como estamos no lado do cliente e o conector MICROSOFT_EXCEL foi ativado,
  // usaremos a API do Microsoft Graph via Lovable Gateway.
  
  const results = await Promise.all(
    ABAS.map(async (aba) => {
      try {
        // Formato para ler um range no Excel via Graph API
        // A planilha enviada tem dados começando na linha 3 (após cabeçalho)
        const range = "A1:J100"; 
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${EXCEL_FILE_ID}/workbook/worksheets('${aba}')/range(address='${range}')`;
        
        // No Lovable, as chamadas para conectores configurados são interceptadas e autenticadas automaticamente
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
        
        const data = await res.json();
        const rows = data.values as any[][];
        
        if (!rows || rows.length < 3) return { quinzena: aba, registros: [], total: 0 };

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
        return { quinzena: aba, registros, total };
      } catch (e) {
        console.error(`Erro ao carregar aba ${aba}:`, e);
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

