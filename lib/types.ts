export type SheetRow = (string | number)[];

export interface LinhaSabe {
  edicao: number;
  preliminar: boolean;
  lp: { nota: string; diff: string | null; padrao: string };
  mt: { nota: string; diff: string | null; padrao: string };
  participacao: { percentual: string; diff: string | null };
}

export interface BlocoSabe {
  etapa: string;
  rede: string;
  linhas: LinhaSabe[];
  temPreliminar: boolean;
  temQuebraEscala: boolean;
}

export interface AnoSaeb {
  ano: number;
  ir: string | number;
  mat: string | number;
  lp: string | number;
  mp: string | number;
  ideb: string | number;
}

export interface BlocoSaeb {
  etapa: string;
  municipio: string;
  rede: string;
  dadosAnos: AnoSaeb[];
  /** Linha original da planilha — usada apenas no servidor para montar `info`, removida antes de enviar ao cliente. */
  raw?: SheetRow;
}

export interface InfoEntidade {
  nome: string;
  regional?: string;
  municipio?: string;
  codigo: string | number;
  rede?: string;
  dataAtual: string;
}

export interface RespostaRelatorio {
  sucesso: true;
  tipo: "escola" | "municipio" | "regional";
  info: InfoEntidade;
  historico: BlocoSabe[];
  saeb: Omit<BlocoSaeb, "raw">[];
}

export interface RegionalOpcao {
  num: number;
  nome: string;
}

export interface NotaSalvaMeta {
  id: string;
  titulo: string;
  tipo: string;
  entidade: string;
  numero: string;
  autor: string;
  criadoEm: string;
  atualizadoEm: string;
  urlHtml: string;
  urlPdf: string;
  /** Nome de quem está com a nota aberta para edição agora ("" = livre). */
  editandoPor: string;
  editandoDesde: string;
}

export interface NotaAberta {
  sucesso: true;
  id: string;
  titulo: string;
  tipo: string;
  entidade: string;
  numero: string;
  html: string;
  /** true quando outra pessoa está editando: abre sem permitir salvar. */
  somenteLeitura?: boolean;
  editandoPor?: string;
  editandoDesde?: string;
}

export interface RespostaErro {
  erro: string;
}

export type RespostaBusca = RespostaRelatorio | RespostaErro;

export interface LoginSucesso {
  sucesso: true;
  nome: string;
}

export interface LoginFalha {
  sucesso: false;
  msg: string;
}

export type RespostaLogin = LoginSucesso | LoginFalha;
