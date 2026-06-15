import { getMultipleSheetValues } from "./sheets";
import {
  COLUNAS_SABE_MUN,
  COLUNAS_SAEB_MUN,
  COLUNAS_SAEB_MUN_25,
  NOME_ABA_SABE_MUN,
  NOME_ABA_SABE_MUN_2025,
  NOME_ABA_SAEB_MUN,
  NOME_ABA_SAEB_MUN_25,
} from "./constants";
import { processarHistoricoMun } from "./processarSabe";
import { processarSaebGenerico } from "./processarSaeb";
import { formatarDataAtual } from "./formatters";
import type { BlocoSaeb, InfoEntidade, RespostaBusca, SheetRow } from "./types";

export async function buscarDadosMunicipio(cdMunicipio: string): Promise<RespostaBusca> {
  if (!cdMunicipio) return { erro: "Por favor, digite um código de município." };
  const cdMunStr = String(cdMunicipio).trim();

  const abas = await getMultipleSheetValues([
    NOME_ABA_SABE_MUN,
    NOME_ABA_SABE_MUN_2025,
    NOME_ABA_SAEB_MUN,
    NOME_ABA_SAEB_MUN_25,
  ]);

  // --- SABE ---
  let dadosSabeMun: SheetRow[] = (abas[NOME_ABA_SABE_MUN] || []).filter(
    (row, i) => i > 0 && String(row[COLUNAS_SABE_MUN.CD_MUNICIPIO]).trim() === cdMunStr
  );
  const linhas25 = (abas[NOME_ABA_SABE_MUN_2025] || []).filter(
    (row, i) => i > 0 && String(row[COLUNAS_SABE_MUN.CD_MUNICIPIO]).trim() === cdMunStr
  );
  dadosSabeMun = dadosSabeMun.concat(linhas25);

  // --- SAEB ---
  let historicoSaebMun: BlocoSaeb[] = [];
  const dadosBrutosSaeb = abas[NOME_ABA_SAEB_MUN] || [];
  const dadosSaebMunFiltrado = dadosBrutosSaeb.filter(
    (row, i) => i > 0 && String(row[COLUNAS_SAEB_MUN.CD_MUNICIPIO]).trim() === cdMunStr
  );

  const d25m = abas[NOME_ABA_SAEB_MUN_25] || [];
  const linhas25Mun = d25m.filter(
    (row, i) => i > 0 && String(row[COLUNAS_SAEB_MUN_25.CD_MUNICIPIO]).trim() === cdMunStr
  );

  if (dadosSaebMunFiltrado.length > 0) {
    historicoSaebMun = processarSaebGenerico(
      dadosSaebMunFiltrado,
      linhas25Mun,
      COLUNAS_SAEB_MUN,
      COLUNAS_SAEB_MUN_25,
      COLUNAS_SAEB_MUN.MUNICIPIO
    );
  }

  if (dadosSabeMun.length === 0 && historicoSaebMun.length === 0) {
    return { erro: "Nenhum município encontrado com este código." };
  }

  const dataAtual = formatarDataAtual();
  let info: InfoEntidade;

  if (dadosSabeMun.length > 0) {
    dadosSabeMun.sort((a, b) => Number(b[COLUNAS_SABE_MUN.EDICAO]) - Number(a[COLUNAS_SABE_MUN.EDICAO]));
    const infoRecente = dadosSabeMun[0];
    info = {
      nome: String(infoRecente[COLUNAS_SABE_MUN.MUNICIPIO]),
      regional: String(infoRecente[COLUNAS_SABE_MUN.REGIONAL]),
      codigo: infoRecente[COLUNAS_SABE_MUN.CD_MUNICIPIO],
      dataAtual,
    };
  } else {
    const row = historicoSaebMun[0].raw!;
    info = {
      nome: String(row[COLUNAS_SAEB_MUN.MUNICIPIO]),
      regional: "BAHIA",
      codigo: row[COLUNAS_SAEB_MUN.CD_MUNICIPIO],
      dataAtual,
    };
  }

  return {
    sucesso: true,
    tipo: "municipio",
    info,
    historico: processarHistoricoMun(dadosSabeMun),
    saeb: historicoSaebMun.map(({ raw: _raw, ...resto }) => resto),
  };
}
