import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!url) {
      return NextResponse.json({ erro: "GOOGLE_APPS_SCRIPT_URL não configurada." }, { status: 500 });
    }

    const { nome, pdfBase64 } = await request.json();
    if (!nome || !pdfBase64) {
      return NextResponse.json({ erro: "Informe nome e pdfBase64." }, { status: 400 });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "salvarPdf", nome, pdfBase64 }),
      redirect: "follow",
      cache: "no-store",
    });

    const json = await res.json();
    if (json.erro) return NextResponse.json({ erro: json.erro }, { status: 502 });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : "Erro desconhecido ao salvar no Drive." },
      { status: 500 }
    );
  }
}
