import { NextResponse } from "next/server";
import { getSheetValues } from "@/lib/sheets";

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function GET() {
  try {
    const rows = await getSheetValues("Bahia");
    if (rows.length < 2) return NextResponse.json([]);
    const [, ...data] = rows; // skip header row
    const result = data
      .map((row) => ({
        fonte: String(row[0] ?? "").trim(),
        ano: Number(row[1]) || 0,
        etapa: String(row[2] ?? "").trim(),
        rede: String(row[3] ?? "").trim(),
        lp: parseNum(row[4]),
        mt: parseNum(row[5]),
        ideb: parseNum(row[6]),
      }))
      .filter((r) => r.fonte && r.ano && r.etapa && r.rede);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
