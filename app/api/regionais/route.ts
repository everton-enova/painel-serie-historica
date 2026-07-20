import { NextResponse } from "next/server";
import { chamarScript } from "@/lib/scriptApi";
import type { RegionalOpcao } from "@/lib/types";

export async function GET() {
  try {
    const lista = await chamarScript<RegionalOpcao[]>("regionais");
    return NextResponse.json(lista);
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
