import { NextRequest, NextResponse } from "next/server";
import { buscarDadosMunicipio } from "@/lib/buscarMunicipio";

export async function GET(request: NextRequest) {
  try {
    const cd = request.nextUrl.searchParams.get("cd") || "";
    const resultado = await buscarDadosMunicipio(cd);
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
