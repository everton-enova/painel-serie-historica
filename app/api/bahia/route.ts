import { NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(String(val).replace(",", ".").replace("%", "").trim());
  return isNaN(n) ? null : n;
}

export async function GET() {
  try {
    const rows = await getSheetValues("SABE_BAHIA");
    if (rows.length < 2) return NextResponse.json({ sabe: [] });

    const [, ...data] = rows; // skip header
    // Cols: EDICAO(0) ESTADO(1) REDE(2) ETAPA(3) DISCIPLINA(4)
    //       PREVISTOS(5) AVALIADOS(6) PARTICIPACAO(7) PROFICIENCIA(8) PADRAO(9)
    const sabe = data
      .map((row) => ({
        edicao: String(row[0] ?? "").trim(),
        estado: String(row[1] ?? "").trim(),
        rede: String(row[2] ?? "").trim(),
        etapa: String(row[3] ?? "").trim(),
        disciplina: String(row[4] ?? "").trim(),
        previstos: parseNum(row[5]),
        avaliados: parseNum(row[6]),
        participacao: parseNum(row[7]),
        proficiencia: parseNum(row[8]),
        padraoDesempenho: String(row[9] ?? "").trim(),
      }))
      .filter((r) => r.edicao && r.etapa && r.rede && r.disciplina);

    return NextResponse.json({ sabe });
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
