export function formatarDataAtual(): string {
  const hoje = new Date();
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(hoje);
}

export const ANO_NOTA = "2026";

export function nomeArquivoNota(numNota: string, assunto: string): string {
  const num = numNota.trim();
  const numero = /^\d+$/.test(num) ? num.padStart(3, "0") : num || "___";
  const titulo = assunto.trim() || "Sem assunto";
  return `NT-${numero}_${ANO_NOTA}/CAV - "${titulo}"`;
}

export function formatar(v: unknown, d = 2): string {
  if (v === null || v === undefined || v === "" || v === "ND" || v === "-") return "-";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(n)) return "-";
  return n.toFixed(d).replace(".", ",");
}

export function formatarPercentual(v: unknown): string {
  return formatar(v) + "%";
}

export function formatarEtapaCompleta(t: unknown): string {
  if (!t) return "";
  let s = String(t).toUpperCase();
  s = s.replace(/\bAI\b/g, "ANOS INICIAIS").replace(/\bAF\b/g, "ANOS FINAIS").replace(/\bEM\b/g, "ENSINO MÉDIO");
  return s;
}
