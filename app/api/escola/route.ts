import { NextRequest, NextResponse } from "next/server";
import { chamarScript, adaptarRespostaBusca, type GsRespostaBusca } from "@/lib/scriptApi";
import { getSheetValues } from "@/lib/sheets";
import { NOME_ABA_DADOS } from "@/lib/constants";

function normalizarCabecalho(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

async function aplicarCadastroMaisRecente(
  coInep: string,
  resposta: ReturnType<typeof adaptarRespostaBusca>
) {
  if ("erro" in resposta) return resposta;

  try {
    const dados = await getSheetValues(NOME_ABA_DADOS);
    if (dados.length < 2) return resposta;

    const cabecalhos = dados[0].map(normalizarCabecalho);
    const idxEdicao = cabecalhos.indexOf("EDICAO");
    const idxTipo = cabecalhos.indexOf("TIPO");
    const idxInep = cabecalhos.indexOf("CO_INEP");
    const idxEscola = cabecalhos.indexOf("ESCOLA");
    const idxRegional = cabecalhos.indexOf("REGIONAL");
    const idxMunicipio = cabecalhos.indexOf("MUNICIPIO");
    const idxRede = cabecalhos.indexOf("REDE");

    if (idxEdicao < 0 || idxInep < 0 || idxEscola < 0) return resposta;

    const linhasDaEscola = dados.slice(1).filter((row) => {
      const mesmoInep = String(row[idxInep] ?? "").trim() === coInep;
      const tipoEscola = idxTipo < 0 || normalizarCabecalho(row[idxTipo]) === "ESCOLA";
      return mesmoInep && tipoEscola;
    });

    if (linhasDaEscola.length === 0) return resposta;

    const maisRecente = linhasDaEscola.reduce((atual, linha) => {
      const edicaoAtual = Number(atual[idxEdicao]) || 0;
      const edicaoLinha = Number(linha[idxEdicao]) || 0;
      return edicaoLinha > edicaoAtual ? linha : atual;
    }, linhasDaEscola[0]);

    const nome = String(maisRecente[idxEscola] ?? "").trim();
    if (nome) resposta.info.nome = nome;

    if (idxRegional >= 0) {
      const regional = String(maisRecente[idxRegional] ?? "").trim();
      if (regional) resposta.info.regional = regional;
    }
    if (idxMunicipio >= 0) {
      const municipio = String(maisRecente[idxMunicipio] ?? "").trim();
      if (municipio) resposta.info.municipio = municipio;
    }
    if (idxRede >= 0) {
      const rede = String(maisRecente[idxRede] ?? "").trim();
      if (rede) resposta.info.rede = rede;
    }

    return resposta;
  } catch {
    // Se a consulta complementar falhar, preserva a resposta normal do backend.
    return resposta;
  }
}

export async function GET(request: NextRequest) {
  try {
    const coInep = request.nextUrl.searchParams.get("coInep") || "";
    const gs = await chamarScript<GsRespostaBusca>("escola", { codigo: coInep });
    const resposta = adaptarRespostaBusca(gs);
    const respostaAtualizada = await aplicarCadastroMaisRecente(coInep, resposta);
    return NextResponse.json(respostaAtualizada);
  } catch (err) {
    return NextResponse.json(
      { erro: "Erro no servidor: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
