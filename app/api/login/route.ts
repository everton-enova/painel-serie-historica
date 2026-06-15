import { NextRequest, NextResponse } from "next/server";
import { verificarLogin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const cpf = body?.cpf;
    const resultado = await verificarLogin(cpf);
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({
      sucesso: false,
      msg: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)),
    });
  }
}
