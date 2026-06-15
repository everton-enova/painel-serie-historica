// Nomes das abas da planilha de origem
export const NOME_ABA_DADOS = "SABE 19 a 25";
export const NOME_ABA_SAEB = "Saeb 23";
export const NOME_ABA_COLABORADORES = "Colaboradores";
export const NOME_ABA_SABE_MUN = "SABE_MUN";
export const NOME_ABA_SAEB_MUN = "Saeb_MUN";
export const NOME_ABA_SAEB_25 = "Saeb 25";
export const NOME_ABA_SAEB_MUN_25 = "Saeb_MUN_25";
export const NOME_ABA_SABE_2025 = "SABE 2025";
export const NOME_ABA_SABE_MUN_2025 = "SABE_MUN_2025";

// Índices das colunas — SABE Escola
export const COLUNAS = {
  REDE: 0,
  REGIONAL: 1,
  CD_MUNICIPIO: 2,
  MUNICIPIO: 3,
  CO_INEP: 4,
  ESCOLA: 5,
  EDICAO: 6,
  ETAPA: 7,
  DISCIPLINA: 8,
  PROFICIENCIA: 9,
  PADRAO_DESEMPENHO: 10,
  PREVISTOS: 11,
  AVALIADOS: 12,
  PARTICIPACAO: 13,
} as const;

// Índices das colunas — SAEB 23 Escola
export const COLUNAS_SAEB = {
  ETAPA: 0,
  CD_MUNICIPIO: 1,
  MUNICIPIO: 2,
  CO_INEP: 3,
  ESCOLA: 4,
  REDE: 5,
  IR19: 6,
  IR21: 7,
  IR23: 8,
  MAT19: 9,
  LP19: 10,
  MP19: 11,
  IDEB19: 12,
  MAT21: 13,
  LP21: 14,
  MP21: 15,
  IDEB21: 16,
  MAT23: 17,
  LP23: 18,
  MP23: 19,
  IDEB23: 20,
} as const;

// Índices das colunas — SABE Município
export const COLUNAS_SABE_MUN = {
  REGIONAL: 0,
  CD_MUNICIPIO: 1,
  MUNICIPIO: 2,
  REDE: 3,
  EDICAO: 4,
  ETAPA: 5,
  DISCIPLINA: 6,
  PROFICIENCIA: 7,
  PADRAO_DESEMPENHO: 8,
  PREVISTOS: 9,
  AVALIADOS: 10,
  PARTICIPACAO: 11,
} as const;

// Índices das colunas — SAEB 23 Município
export const COLUNAS_SAEB_MUN = {
  ETAPA: 0,
  CD_MUNICIPIO: 1,
  MUNICIPIO: 2,
  REDE: 3,
  IR19: 4,
  IR21: 5,
  IR23: 6,
  MAT19: 7,
  LP19: 8,
  MP19: 9,
  IDEB19: 10,
  MAT21: 11,
  LP21: 12,
  MP21: 13,
  IDEB21: 14,
  MAT23: 15,
  LP23: 16,
  MP23: 17,
  IDEB23: 18,
} as const;

// Índices das colunas — SAEB 25 Escola
export const COLUNAS_SAEB_25 = {
  ETAPA: 0,
  CD_MUNICIPIO: 1,
  MUNICIPIO: 2,
  CO_INEP: 3,
  ESCOLA: 4,
  REDE: 5,
  IR25: 6,
  MAT25: 7,
  LP25: 8,
  MP25: 9,
  IDEB25: 10,
} as const;

// Índices das colunas — SAEB 25 Município
export const COLUNAS_SAEB_MUN_25 = {
  ETAPA: 0,
  CD_MUNICIPIO: 1,
  MUNICIPIO: 2,
  REDE: 3,
  IR25: 4,
  MAT25: 5,
  LP25: 6,
  MP25: 7,
  IDEB25: 8,
} as const;
