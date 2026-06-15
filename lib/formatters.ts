export function formatarDataAtual(): string {
  const hoje = new Date();
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(hoje);
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
