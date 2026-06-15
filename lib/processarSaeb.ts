import { normalizarTexto, ordemEtapa } from "./normalize";
import type { AnoSaeb, BlocoSaeb, SheetRow } from "./types";

interface ColMapSaeb {
  ETAPA: number;
  REDE: number;
  IR19: number;
  MAT19: number;
  LP19: number;
  MP19: number;
  IDEB19: number;
  IR21: number;
  MAT21: number;
  LP21: number;
  MP21: number;
  IDEB21: number;
  IR23: number;
  MAT23: number;
  LP23: number;
  MP23: number;
  IDEB23: number;
}

interface ColMapSaeb25 {
  ETAPA: number;
  REDE: number;
  IR25: number;
  MAT25: number;
  LP25: number;
  MP25: number;
  IDEB25: number;
}

/**
 * Porte de processarSaeb/processarSaebMun do Code.gs. `nomeEntidadeIdx` é o
 * índice da coluna que identifica a entidade (escola ou município).
 */
export function processarSaebGenerico(
  dados: SheetRow[],
  linhas25: SheetRow[],
  C: ColMapSaeb,
  C25: ColMapSaeb25,
  nomeEntidadeIdx: number
): BlocoSaeb[] {
  const resultado: BlocoSaeb[] = [];

  dados.forEach((row) => {
    const etapa = String(row[C.ETAPA]).trim();
    const entidade = row[nomeEntidadeIdx];
    const rede = String(row[C.REDE]);

    const anos: AnoSaeb[] = [
      { ano: 2019, ir: row[C.IR19], mat: row[C.MAT19], lp: row[C.LP19], mp: row[C.MP19], ideb: row[C.IDEB19] },
      { ano: 2021, ir: row[C.IR21], mat: row[C.MAT21], lp: row[C.LP21], mp: row[C.MP21], ideb: row[C.IDEB21] },
      { ano: 2023, ir: row[C.IR23], mat: row[C.MAT23], lp: row[C.LP23], mp: row[C.MP23], ideb: row[C.IDEB23] },
    ];

    if (linhas25 && linhas25.length > 0) {
      const match = linhas25.find(
        (r) =>
          normalizarTexto(String(r[C25.ETAPA])) === normalizarTexto(etapa) &&
          normalizarTexto(String(r[C25.REDE])) === normalizarTexto(rede)
      );
      if (match) {
        anos.push({
          ano: 2025,
          ir: match[C25.IR25],
          mat: match[C25.MAT25],
          lp: match[C25.LP25],
          mp: match[C25.MP25],
          ideb: match[C25.IDEB25],
        });
      }
    }

    resultado.push({ etapa, municipio: String(entidade), rede, dadosAnos: anos, raw: row });
  });

  resultado.sort((a, b) => ordemEtapa(normalizarTexto(a.etapa)) - ordemEtapa(normalizarTexto(b.etapa)));
  return resultado;
}
