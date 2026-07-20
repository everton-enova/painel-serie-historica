import { NextRequest, NextResponse } from "next/server";
import { chamarScript, adaptarRespostaBusca, type GsRespostaBusca } from "@/lib/scriptApi";

export async function GET(request: NextRequest) {
  try {
    const nte = request.nextUrl.searchParams.get("nte") || "";
    const gs = await chamarScript<GsRespostaBusca>("regional", { nte });
    return NextResponse.json(adaptarRespostaBusca(gs));
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
