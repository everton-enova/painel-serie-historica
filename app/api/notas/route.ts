import { NextRequest, NextResponse } from "next/server";
import { chamarScript, postScript } from "@/lib/scriptApi";

// GET /api/notas            → lista as notas salvas (aba índice)
// GET /api/notas?id=...     → abre uma nota (conteúdo HTML do Drive)
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const dados = id ? await chamarScript("abrir", { id }) : await chamarScript("recentes");
    return NextResponse.json(dados);
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}

// POST /api/notas  body { acao: "salvar", payload } | { acao: "excluir", id }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.acao === "salvar") {
      return NextResponse.json(await postScript({ fn: "salvar", payload: body.payload }));
    }
    if (body.acao === "excluir") {
      return NextResponse.json(await postScript({ fn: "excluir", id: body.id }));
    }
    return NextResponse.json({ erro: "Ação desconhecida." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
