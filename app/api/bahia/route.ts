import { NextResponse } from "next/server";
import { getMultipleSheetValues } from "@/lib/sheets";
import { chamarScript } from "@/lib/scriptApi";

function n(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const v = Number(String(val).replace(",", ".").trim());
  return isNaN(v) ? null : v;
}

const ANOS_SAEB = [2019, 2021, 2023, 2025];
// Offsets within each year block (base col = 3): IR, MAT, LP, MP, IDEB
const SAEB_KEYS = ["ir", "mat", "lp", "mp", "ideb"] as const;

interface LinhaSabeEstado {
  edicao: string;
  estado: string;
  rede: string;
  etapa: string;
  disciplina: string;
  previstos: number | null;
  avaliados: number | null;
  participacao: number | null;
  proficiencia: number | null;
  padraoDesempenho: string;
}

export async function GET() {
  try {
    // SABE estadual agora vem das linhas TIPO=ESTADO da aba "SABE 19 a 25"
    // (a aba SABE_BAHIA foi excluída na reestruturação da planilha).
    const [sabe, sheets] = await Promise.all([
      chamarScript<LinhaSabeEstado[]>("sabeEstado"),
      getMultipleSheetValues(["Saeb_BAHIA"]),
    ]);

    // ── SAEB ────────────────────────────────────────────────────────────
    // Cols: ETAPA(0) TIPO(1) REDE(2)
    //       then 4 groups of 5 (IR, MAT, LP, MP, IDEB) for years 19,21,23,25
    const saebRows = sheets["Saeb_BAHIA"] ?? [];
    const saeb: object[] = [];
    saebRows.slice(1).forEach((row) => {
      const etapa = String(row[0] ?? "").trim();
      const tipo = String(row[1] ?? "").trim();
      const rede = String(row[2] ?? "").trim();
      if (!etapa || !rede) return;
      ANOS_SAEB.forEach((ano, yi) => {
        const base = 3 + yi * 5;
        const entrada: Record<string, unknown> = { etapa, tipo, rede, ano };
        SAEB_KEYS.forEach((key, ki) => { entrada[key] = n(row[base + ki]); });
        saeb.push(entrada);
      });
    });

    return NextResponse.json({ sabe, saeb });
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
