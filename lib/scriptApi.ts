// Cliente da API por função do Apps Script (?fn=... / doPost) e
// adaptadores que convertem o formato do backend (números crus) para os
// tipos consumidos pelos componentes React (strings formatadas).

import { calcularPadrao, type Disciplina } from "./padrao";
import { normalizarTexto } from "./normalize";
import type { BlocoSabe, BlocoSaeb, InfoEntidade, LinhaSabe, RespostaBusca } from "./types";

function scriptUrl(): string {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) throw new Error("Variável de ambiente GOOGLE_APPS_SCRIPT_URL não configurada.");
  return url;
}

export async function chamarScript<T>(fn: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ fn, ...params });
  const res = await fetch(`${scriptUrl()}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erro ao chamar o Apps Script (${fn}): ${res.status}`);
  return (await res.json()) as T;
}

export async function postScript<T>(body: unknown): Promise<T> {
  const res = await fetch(scriptUrl(), {
    method: "POST",
    // text/plain evita bloqueios do Apps Script; o corpo é JSON mesmo assim
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erro ao gravar no Apps Script: ${res.status}`);
  return (await res.json()) as T;
}

// ── Formatos crus retornados pelo Apps Script ──

interface GsNotaDisciplina {
  nota?: number | null;
  padrao?: string;
  diff?: number;
}

interface GsLinhaSabe {
  edicao: number;
  preliminar?: boolean;
  lp?: GsNotaDisciplina;
  mt?: GsNotaDisciplina;
  participacao?: { percentual?: number; diff?: number };
}

interface GsBlocoSabe {
  etapa: string;
  rede: string;
  linhas: GsLinhaSabe[];
  temPreliminar?: boolean;
}

interface GsBlocoSaeb {
  etapa: string;
  rede: string;
  municipio: string;
  dadosAnos: { ano: number; ir: number | null; mat: number | null; lp: number | null; mp: number | null; ideb: number | null }[];
}

export interface GsRespostaBusca {
  erro?: string;
  tipo?: string;
  info?: InfoEntidade;
  historico?: GsBlocoSabe[];
  saeb?: GsBlocoSaeb[];
}

// ── Adaptadores ──

// 2° ano passou a usar a escala Saeb (média 750, dp 50) a partir de 2023;
// proficiência de 2022 não é comparável às edições seguintes nessa etapa.
const ANO_QUEBRA_ESCALA = 2023;

function numStr(v: number | null | undefined, casas = 1): string {
  return v == null || isNaN(v) ? "-" : v.toFixed(casas);
}

function diffStr(v: number | null | undefined): string | null {
  return v == null || isNaN(v) ? null : v.toFixed(1);
}

function padraoDe(etapa: string, disc: Disciplina, d?: GsNotaDisciplina): string {
  if (d?.padrao) return d.padrao;
  if (d?.nota != null) return calcularPadrao(etapa, disc, d.nota) || "-";
  return "-";
}

function adaptarBlocoSabe(b: GsBlocoSabe): BlocoSabe {
  const isSegundoAno = normalizarTexto(b.etapa).includes("2 ANO");
  const ordenadas = [...(b.linhas || [])].sort((a, c) => a.edicao - c.edicao);
  const temQuebraEscala =
    isSegundoAno &&
    ordenadas.some((l) => l.edicao < ANO_QUEBRA_ESCALA) &&
    ordenadas.some((l) => l.edicao >= ANO_QUEBRA_ESCALA);

  const linhas: LinhaSabe[] = ordenadas.map((l, idx) => {
    const ant = idx > 0 ? ordenadas[idx - 1] : null;
    const quebraAqui =
      isSegundoAno && !!ant && ant.edicao < ANO_QUEBRA_ESCALA && l.edicao >= ANO_QUEBRA_ESCALA;
    return {
      edicao: l.edicao,
      preliminar: !!l.preliminar,
      lp: {
        nota: numStr(l.lp?.nota),
        diff: quebraAqui ? null : diffStr(l.lp?.diff),
        padrao: padraoDe(b.etapa, "LP", l.lp),
      },
      mt: {
        nota: numStr(l.mt?.nota),
        diff: quebraAqui ? null : diffStr(l.mt?.diff),
        padrao: padraoDe(b.etapa, "MT", l.mt),
      },
      participacao: {
        percentual: numStr(l.participacao?.percentual),
        diff: diffStr(l.participacao?.diff),
      },
    };
  });

  return {
    etapa: b.etapa,
    rede: b.rede,
    linhas,
    temPreliminar: linhas.some((l) => l.preliminar),
    temQuebraEscala,
  };
}

function adaptarBlocoSaeb(b: GsBlocoSaeb): Omit<BlocoSaeb, "raw"> {
  return {
    etapa: b.etapa,
    rede: b.rede,
    municipio: b.municipio,
    dadosAnos: (b.dadosAnos || []).map((d) => ({
      ano: d.ano,
      ir: d.ir ?? "-",
      mat: d.mat ?? "-",
      lp: d.lp ?? "-",
      mp: d.mp ?? "-",
      ideb: d.ideb ?? "-",
    })),
  };
}

export function adaptarRespostaBusca(gs: GsRespostaBusca): RespostaBusca {
  if (gs.erro) return { erro: gs.erro };
  if (!gs.info || !gs.tipo) return { erro: "Resposta inesperada do Apps Script." };
  return {
    sucesso: true,
    tipo: gs.tipo as "escola" | "municipio" | "regional",
    info: gs.info,
    historico: (gs.historico || []).map(adaptarBlocoSabe),
    saeb: (gs.saeb || []).map(adaptarBlocoSaeb),
  };
}
