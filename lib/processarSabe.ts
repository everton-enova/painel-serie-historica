import { chaveCanonica, normalizarTexto, ordemChave } from "./normalize";
import { calcularPadrao } from "./padrao";
import { COLUNAS, COLUNAS_SABE_MUN } from "./constants";
import type { BlocoSabe, LinhaSabe, SheetRow } from "./types";

interface ColMapSabe {
  ETAPA: number;
  REDE: number;
  EDICAO: number;
  DISCIPLINA: number;
  PROFICIENCIA: number;
  PADRAO_DESEMPENHO: number;
  PARTICIPACAO: number;
}

interface GrupoEtapa {
  nomeExibicao: string;
  rede: string;
  dados: SheetRow[];
}

export function processarHistoricoGenerico(dados: SheetRow[], C: ColMapSabe): BlocoSabe[] {
  const gruposEtapa: Record<string, GrupoEtapa> = {};

  dados.forEach((d) => {
    const etapaOriginal = String(d[C.ETAPA]);
    const rede = String(d[C.REDE]);
    const chave = chaveCanonica(etapaOriginal, rede);
    if (!gruposEtapa[chave]) {
      gruposEtapa[chave] = { nomeExibicao: etapaOriginal, rede, dados: [] };
    }
    if (Number(d[C.EDICAO]) < 2025) {
      gruposEtapa[chave].nomeExibicao = etapaOriginal;
    }
    gruposEtapa[chave].dados.push(d);
  });

  const resultado: BlocoSabe[] = [];

  Object.keys(gruposEtapa)
    .sort((a, b) => ordemChave(a) - ordemChave(b))
    .forEach((chave) => {
      const grupo = gruposEtapa[chave];
      const dadosEtapa = grupo.dados;
      const etapaNome = grupo.nomeExibicao;
      const rede = grupo.rede;
      const edicoesUnicas = [...new Set(dadosEtapa.map((d) => Number(d[C.EDICAO])))].sort((a, b) => a - b);
      const linhasTabela: LinhaSabe[] = [];

      edicoesUnicas.forEach((edicao, idx) => {
        const dadosAno = dadosEtapa.filter((d) => Number(d[C.EDICAO]) === edicao);
        const lp = dadosAno.find((d) => /PORTUGU|LP/.test(String(d[C.DISCIPLINA]).toUpperCase()));
        const mt = dadosAno.find((d) => /MATEM|MT/.test(String(d[C.DISCIPLINA]).toUpperCase()));

        const padraoLp = lp
          ? String(lp[C.PADRAO_DESEMPENHO] || calcularPadrao(etapaNome, "LP", lp[C.PROFICIENCIA]))
          : "-";
        const padraoMt = mt
          ? String(mt[C.PADRAO_DESEMPENHO] || calcularPadrao(etapaNome, "MT", mt[C.PROFICIENCIA]))
          : "-";

        let diffLp: string | null = null;
        let diffMt: string | null = null;
        let diffPart: string | null = null;

        if (idx > 0) {
          const edicaoAnt = edicoesUnicas[idx - 1];
          const dadosAnt = dadosEtapa.filter((d) => Number(d[C.EDICAO]) === edicaoAnt);
          const lpAnt = dadosAnt.find((d) => /PORTUGU|LP/.test(String(d[C.DISCIPLINA]).toUpperCase()));
          const mtAnt = dadosAnt.find((d) => /MATEM|MT/.test(String(d[C.DISCIPLINA]).toUpperCase()));

          // 2° ano passou a usar a escala Saeb (média 750, dp 50) a partir de 2023;
          // proficiência de 2022 não é comparável às edições seguintes nessa etapa.
          const escalaQuebrada = normalizarTexto(etapaNome).includes("2 ANO") && edicaoAnt < 2023 && edicao >= 2023;

          if (!escalaQuebrada) {
            if (lp && lpAnt) diffLp = (Number(lp[C.PROFICIENCIA]) - Number(lpAnt[C.PROFICIENCIA])).toFixed(1);
            if (mt && mtAnt) diffMt = (Number(mt[C.PROFICIENCIA]) - Number(mtAnt[C.PROFICIENCIA])).toFixed(1);
          }

          let pAt = lp ? Number(lp[C.PARTICIPACAO]) : mt ? Number(mt[C.PARTICIPACAO]) : 0;
          let pAn = lpAnt ? Number(lpAnt[C.PARTICIPACAO]) : mtAnt ? Number(mtAnt[C.PARTICIPACAO]) : 0;
          if (pAt <= 1) pAt *= 100;
          if (pAn <= 1) pAn *= 100;
          if (pAt && pAn) diffPart = (pAt - pAn).toFixed(1);
        }

        let participacao = String(lp ? lp[C.PARTICIPACAO] : mt ? mt[C.PARTICIPACAO] : "-");
        const pNum = parseFloat(participacao);
        if (!isNaN(pNum)) {
          participacao = pNum <= 1 ? (pNum * 100).toFixed(1) : pNum.toFixed(1);
        }

        linhasTabela.push({
          edicao,
          preliminar: edicao === 2025,
          lp: { nota: lp ? parseFloat(String(lp[C.PROFICIENCIA])).toFixed(1) : "-", diff: diffLp, padrao: padraoLp },
          mt: { nota: mt ? parseFloat(String(mt[C.PROFICIENCIA])).toFixed(1) : "-", diff: diffMt, padrao: padraoMt },
          participacao: { percentual: participacao, diff: diffPart },
        });
      });

      resultado.push({
        etapa: etapaNome,
        rede,
        linhas: linhasTabela,
        temPreliminar: linhasTabela.some((l) => l.preliminar),
      });
    });

  return resultado;
}

export function processarHistorico(dados: SheetRow[]): BlocoSabe[] {
  return processarHistoricoGenerico(dados, COLUNAS);
}

export function processarHistoricoMun(dados: SheetRow[]): BlocoSabe[] {
  return processarHistoricoGenerico(dados, COLUNAS_SABE_MUN);
}
