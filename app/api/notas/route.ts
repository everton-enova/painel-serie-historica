import { NextRequest, NextResponse } from "next/server";
import { chamarScript, postScript } from "@/lib/scriptApi";

// GET /api/notas                     → lista as notas salvas (pasta do Drive)
// GET /api/notas?lixeira=1           → lista notas na lixeira
// GET /api/notas?id=...&autor=...     → abre uma nota e reserva a edição p/ o autor
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const autor = request.nextUrl.searchParams.get("autor") || "";
    const lixeira = request.nextUrl.searchParams.get("lixeira");
    const dados = id
      ? await chamarScript("abrir", { id, autor })
      : lixeira
        ? await chamarScript("lixeira")
        : await chamarScript("recentes");
    return NextResponse.json(dados);
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}

// POST /api/notas  body { acao: "salvar", payload } | { acao: "excluir", id }
//                       | { acao: "restaurar", id } | { acao: "excluirDefinitivo", id }
//                       | { acao: "editando" | "liberar", id, autor }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.acao === "salvar") {
      return NextResponse.json(await postScript({ fn: "salvar", payload: body.payload }));
    }
    if (body.acao === "excluir") {
      return NextResponse.json(await postScript({ fn: "excluir", id: body.id }));
    }
    if (body.acao === "restaurar") {
      return NextResponse.json(await postScript({ fn: "restaurar", id: body.id }));
    }
    if (body.acao === "excluirDefinitivo") {
      return NextResponse.json(await postScript({ fn: "excluirDefinitivo", id: body.id }));
    }
    // Heartbeat / liberação da trava de edição
    if (body.acao === "editando" || body.acao === "liberar") {
      return NextResponse.json(await postScript({ fn: body.acao, id: body.id, autor: body.autor }));
    }
    return NextResponse.json({ erro: "Ação desconhecida." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
