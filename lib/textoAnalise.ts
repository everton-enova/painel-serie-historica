import { formatar, formatarPercentual } from "./formatters";
import type { AnoSaeb, LinhaSabe } from "./types";

export function gerarTextoAnaliseSabe(etapa: string, rede: string, dados: LinhaSabe | undefined): string {
  if (!dados) return "";
  const ano = dados.edicao;
  const isPrelim = dados.preliminar;
  const partDiff = parseFloat(String(dados.participacao.diff));

  let texto = `Na Rede ${rede}, na etapa ${etapa}, em ${ano}${isPrelim ? " (dados preliminares)" : ""}, `;
  if (!isNaN(partDiff)) {
    if (partDiff > 0) {
      texto += `a participação foi de ${formatarPercentual(dados.participacao.percentual)}, com aumento de ${formatar(Math.abs(partDiff))}% comparado à edição anterior. `;
    } else if (partDiff < 0) {
      texto += `a participação foi de ${formatarPercentual(dados.participacao.percentual)}, com queda de ${formatar(Math.abs(partDiff))}% comparado à edição anterior. `;
    } else {
      texto += `a participação manteve-se estável em ${formatarPercentual(dados.participacao.percentual)}. `;
    }
  } else {
    texto += `a participação foi de ${formatarPercentual(dados.participacao.percentual)}. `;
  }
  texto += `Em Língua Portuguesa, a proficiência média foi ${formatar(dados.lp.nota)}, enquanto em Matemática atingiu ${formatar(dados.mt.nota)}.`;
  return texto;
}

export function gerarTextoAnaliseSaeb(etapa: string, rede: string, atual: AnoSaeb, anterior: AnoSaeb | undefined): string {
  const idebAtual = parseFloat(String(atual.ideb));
  const idebAnt = anterior ? parseFloat(String(anterior.ideb)) : NaN;

  const anoAtual = atual.ano;
  const anoAnt = anterior?.ano;

  let texto = `A rede ${rede}, na etapa ${etapa}, `;
  if (!isNaN(idebAtual)) {
    texto += `apresentou em ${anoAtual} um Ideb de ${formatar(idebAtual, 1)}. `;
    if (!isNaN(idebAnt) && anoAnt) {
      const diff = idebAtual - idebAnt;
      if (diff > 0) {
        texto += `Comparado a ${anoAnt} (${formatar(idebAnt, 1)}), houve crescimento de ${formatar(diff, 1)} ponto(s).`;
      } else if (diff < 0) {
        texto += `Comparado a ${anoAnt} (${formatar(idebAnt, 1)}), houve redução de ${formatar(Math.abs(diff), 1)} ponto(s).`;
      } else {
        texto += `O resultado manteve-se estável em relação a ${anoAnt}.`;
      }
    }
  } else {
    texto += `não teve seu Ideb calculado em ${anoAtual}.`;
  }
  return texto;
}
