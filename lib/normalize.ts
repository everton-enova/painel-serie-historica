export function removerAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function correspondeRede(redeBloco: string, redesAtivas: string[]): boolean {
  const redeUpper = removerAcentos(String(redeBloco).toUpperCase()).trim();
  return redesAtivas.some((r) => redeUpper.includes(removerAcentos(r)));
}

export function normalizarTexto(texto: unknown): string {
  if (!texto) return "";
  let t = String(texto).toUpperCase();
  t = t.replace(/(\d+)[ªº°oaA]\b/g, "$1");
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function chaveCanonica(etapa: unknown, rede: unknown): string {
  const t = normalizarTexto(etapa);
  let c = "OUTRO";
  if (t.includes("2 ANO")) c = "2ANO";
  else if (t.includes("5 ANO")) c = "5ANO";
  else if (t.includes("9 ANO")) c = "9ANO";
  else if (t.includes("3 SERIE")) c = "3SERIE";
  return c + "||" + String(rede).toUpperCase().trim();
}

export function ordemEtapa(etapaNorm: string): number {
  if (etapaNorm.includes("2 ANO")) return 1;
  if (etapaNorm.includes("5 ANO")) return 2;
  if (etapaNorm.includes("9 ANO")) return 3;
  if (etapaNorm.includes("3 SERIE")) return 4;
  return 99;
}

export function ordemChave(chave: string): number {
  if (chave.startsWith("2ANO")) return 1;
  if (chave.startsWith("5ANO")) return 2;
  if (chave.startsWith("9ANO")) return 3;
  if (chave.startsWith("3SERIE")) return 4;
  return 99;
}
