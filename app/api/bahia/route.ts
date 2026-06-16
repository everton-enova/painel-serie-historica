import { NextResponse } from "next/server";
import { getMultipleSheetValues } from "@/lib/sheets";

function n(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const v = Number(String(val).replace(",", ".").trim());
  return isNaN(v) ? null : v;
}

const ANOS_SAEB = [2019, 2021, 2023, 2025];
// Offsets within each year block (base col = 3): IR, MAT, LP, MP, IDEB
const SAEB_KEYS = ["ir", "mat", "lp", "mp", "ideb"] as const;

export async function GET() {
  try {
    const sheets = await getMultipleSheetValues(["SABE_BAHIA", "Saeb_BAHIA"]);

    // ── SABE ────────────────────────────────────────────────────────────
    // Cols: EDICAO(0) ESTADO(1) REDE(2) ETAPA(3) DISCIPLINA(4)
    //       PREVISTOS(5) AVALIADOS(6) PARTICIPACAO(7) PROFICIENCIA(8) PADRAO(9)
    const sabeRows = sheets["SABE_BAHIA"] ?? [];
    const sabe = sabeRows.slice(1)
      .map((row) => ({
        edicao: String(row[0] ?? "").trim(),
        estado: String(row[1] ?? "").trim(),
        rede: String(row[2] ?? "").trim(),
        etapa: String(row[3] ?? "").trim(),
        disciplina: String(row[4] ?? "").trim(),
        previstos: n(row[5]),
        avaliados: n(row[6]),
        participacao: n(row[7]),
        proficiencia: n(row[8]),
        padraoDesempenho: String(row[9] ?? "").trim(),
      }))
      .filter((r) => r.edicao && r.etapa && r.rede && r.disciplina);

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
