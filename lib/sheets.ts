import { google } from "googleapis";
import type { SheetRow } from "./types";

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Credenciais do Google Sheets não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)."
    );
  }

  cachedAuth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return cachedAuth;
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Variável de ambiente GOOGLE_SHEET_ID não configurada.");
  return id;
}

function quoteSheetName(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

/** Busca todos os valores de uma aba. Retorna [] se a aba não existir. */
export async function getSheetValues(sheetName: string): Promise<SheetRow[]> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${quoteSheetName(sheetName)}!A1:Z10000`,
    });
    return (res.data.values as SheetRow[]) || [];
  } catch {
    return [];
  }
}

/**
 * Busca várias abas de uma vez (batchGet). Se alguma aba não existir, o
 * batchGet falha por completo — nesse caso cai para buscas individuais,
 * de forma que abas ausentes simplesmente retornem [].
 */
export async function getMultipleSheetValues(
  sheetNames: string[]
): Promise<Record<string, SheetRow[]>> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const result: Record<string, SheetRow[]> = {};

  try {
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: getSpreadsheetId(),
      ranges: sheetNames.map((name) => `${quoteSheetName(name)}!A1:Z10000`),
    });
    (res.data.valueRanges || []).forEach((vr, i) => {
      result[sheetNames[i]] = (vr.values as SheetRow[]) || [];
    });
    return result;
  } catch {
    await Promise.all(
      sheetNames.map(async (name) => {
        result[name] = await getSheetValues(name);
      })
    );
    return result;
  }
}
