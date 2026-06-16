import type { SheetRow } from "./types";

function getScriptUrl() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url) throw new Error("Variável de ambiente GOOGLE_APPS_SCRIPT_URL não configurada.");
  return url;
}

export async function getSheetValues(sheetName: string): Promise<SheetRow[]> {
  const data = await getMultipleSheetValues([sheetName]);
  return data[sheetName] || [];
}

export async function getMultipleSheetValues(
  sheetNames: string[]
): Promise<Record<string, SheetRow[]>> {
  const url = getScriptUrl();
  const params = new URLSearchParams({ sheets: sheetNames.join(",") });
  const res = await fetch(`${url}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erro ao buscar dados do Apps Script: ${res.status}`);
  const json = await res.json();
  if (json.erro) throw new Error(json.erro);
  return json as Record<string, SheetRow[]>;
}
