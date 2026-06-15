import { normalizarTexto } from "./normalize";

export type Disciplina = "LP" | "MT";

export function calcularPadrao(etapa: unknown, disciplina: Disciplina, nota: unknown): string {
  const notaNum = Number(nota);
  if (!nota || isNaN(notaNum)) return "";

  const etapaNorm = normalizarTexto(etapa);
  const isPort = disciplina === "LP";
  const isMat = disciplina === "MT";

  if (etapaNorm.includes("2 ANO")) {
    if (isPort) return notaNum < 700 ? "Abaixo do Básico" : notaNum < 750 ? "Básico" : notaNum < 800 ? "Adequado" : "Avançado";
    if (isMat) return notaNum < 700 ? "Abaixo do Básico" : notaNum < 750 ? "Básico" : notaNum < 800 ? "Adequado" : "Avançado";
  }
  if (etapaNorm.includes("5 ANO")) {
    if (isPort) return notaNum <= 150 ? "Abaixo do Básico" : notaNum <= 200 ? "Básico" : notaNum <= 250 ? "Adequado" : "Avançado";
    if (isMat) return notaNum <= 175 ? "Abaixo do Básico" : notaNum <= 225 ? "Básico" : notaNum <= 275 ? "Adequado" : "Avançado";
  }
  if (etapaNorm.includes("9 ANO")) {
    if (isPort) return notaNum <= 200 ? "Abaixo do Básico" : notaNum <= 275 ? "Básico" : notaNum <= 325 ? "Adequado" : "Avançado";
    if (isMat) return notaNum <= 225 ? "Abaixo do Básico" : notaNum <= 300 ? "Básico" : notaNum <= 350 ? "Adequado" : "Avançado";
  }
  if (etapaNorm.includes("3 SERIE")) {
    if (isPort) return notaNum <= 250 ? "Abaixo do Básico" : notaNum <= 300 ? "Básico" : notaNum <= 375 ? "Adequado" : "Avançado";
    if (isMat) return notaNum <= 275 ? "Abaixo do Básico" : notaNum <= 350 ? "Básico" : notaNum <= 400 ? "Adequado" : "Avançado";
  }

  return "";
}
