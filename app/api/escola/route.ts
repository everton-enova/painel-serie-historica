import { NextRequest, NextResponse } from "next/server";
import { buscarDadosEscola } from "@/lib/buscarEscola";

export async function GET(request: NextRequest) {
  try {
    const coInep = request.nextUrl.searchParams.get("coInep") || "";
    const resultado = await buscarDadosEscola(coInep);
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
