import { getSheetValues } from "./sheets";
import { NOME_ABA_COLABORADORES } from "./constants";
import type { RespostaLogin } from "./types";

export async function verificarLogin(cpf: string): Promise<RespostaLogin> {
  if (!cpf) return { sucesso: false, msg: "CPF inválido." };
  const cpfLimpo = String(cpf).replace(/\D/g, "");

  const dados = await getSheetValues(NOME_ABA_COLABORADORES);
  if (dados.length === 0) {
    return { sucesso: false, msg: `Aba "${NOME_ABA_COLABORADORES}" não encontrada na planilha.` };
  }

  const headers = dados[0].map((h) => String(h).toUpperCase().trim());
  const idxCpf = headers.indexOf("CPF");
  const idxNome = headers.indexOf("NOME_COLABORADOR");

  if (idxCpf !== -1 && idxNome !== -1) {
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][idxCpf]).replace(/\D/g, "") === cpfLimpo) {
        return { sucesso: true, nome: String(dados[i][idxNome]) };
      }
    }
  } else {
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][1]).replace(/\D/g, "") === cpfLimpo) {
        return { sucesso: true, nome: String(dados[i][0]) };
      }
    }
  }

  return { sucesso: false, msg: "CPF não encontrado na aba Colaboradores." };
}
