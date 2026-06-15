import { getMultipleSheetValues } from "./sheets";
import {
  COLUNAS,
  COLUNAS_SAEB,
  COLUNAS_SAEB_25,
  NOME_ABA_DADOS,
  NOME_ABA_SABE_2025,
  NOME_ABA_SAEB,
  NOME_ABA_SAEB_25,
} from "./constants";
import { processarHistorico } from "./processarSabe";
import { processarSaebGenerico } from "./processarSaeb";
import { formatarDataAtual } from "./formatters";
import type { BlocoSaeb, InfoEntidade, RespostaBusca, SheetRow } from "./types";

export async function buscarDadosEscola(coInep: string): Promise<RespostaBusca> {
  if (!coInep) return { erro: "Por favor, digite um código INEP." };
  const codigo = String(coInep).trim();

  const abas = await getMultipleSheetValues([NOME_ABA_DADOS, NOME_ABA_SABE_2025, NOME_ABA_SAEB, NOME_ABA_SAEB_25]);

  // --- SABE ---
  let dadosSabeEscola: SheetRow[] = (abas[NOME_ABA_DADOS] || []).filter(
    (row, i) => i > 0 && String(row[COLUNAS.CO_INEP]).trim() === codigo
  );
  const linhas25Sabe = (abas[NOME_ABA_SABE_2025] || []).filter(
    (row, i) => i > 0 && String(row[COLUNAS.CO_INEP]).trim() === codigo
  );
  dadosSabeEscola = dadosSabeEscola.concat(linhas25Sabe);

  // --- SAEB ---
  let historicoSaeb: BlocoSaeb[] = [];
  const dadosSaebTotal = abas[NOME_ABA_SAEB] || [];
  const dadosSaebEscola = dadosSaebTotal.filter(
    (row, i) => i > 0 && String(row[COLUNAS_SAEB.CO_INEP]).trim() === codigo
  );

  const d25s = abas[NOME_ABA_SAEB_25] || [];
  const linhas25Saeb = d25s.filter((row, i) => i > 0 && String(row[COLUNAS_SAEB_25.CO_INEP]).trim() === codigo);

  if (dadosSaebEscola.length > 0) {
    historicoSaeb = processarSaebGenerico(
      dadosSaebEscola,
      linhas25Saeb,
      COLUNAS_SAEB,
      COLUNAS_SAEB_25,
      COLUNAS_SAEB.ESCOLA
    );
  }

  if (dadosSabeEscola.length === 0 && historicoSaeb.length === 0) {
    return { erro: "Nenhuma escola encontrada com este código INEP." };
  }

  const dataAtual = formatarDataAtual();
  let info: InfoEntidade;

  if (dadosSabeEscola.length > 0) {
    dadosSabeEscola.sort((a, b) => Number(b[COLUNAS.EDICAO]) - Number(a[COLUNAS.EDICAO]));
    const infoRecente = dadosSabeEscola[0];
    info = {
      nome: String(infoRecente[COLUNAS.ESCOLA]),
      regional: String(infoRecente[COLUNAS.REGIONAL]),
      municipio: String(infoRecente[COLUNAS.MUNICIPIO]),
      codigo: infoRecente[COLUNAS.CO_INEP],
      rede: String(infoRecente[COLUNAS.REDE]),
      dataAtual,
    };
  } else {
    const row = historicoSaeb[0].raw!;
    info = {
      nome: String(row[COLUNAS_SAEB.ESCOLA]),
      regional: "BAHIA",
      municipio: String(row[COLUNAS_SAEB.MUNICIPIO]),
      codigo: row[COLUNAS_SAEB.CO_INEP],
      rede: String(row[COLUNAS_SAEB.REDE]),
      dataAtual,
    };
  }

  return {
    sucesso: true,
    tipo: "escola",
    info,
    historico: processarHistorico(dadosSabeEscola),
    saeb: historicoSaeb.map(({ raw, ...resto }) => resto),
  };
}
