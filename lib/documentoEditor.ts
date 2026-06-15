import { popupPrompt } from "./popup";

export function execCmd(editor: HTMLElement, command: string, value?: string) {
  document.execCommand(command, false, value);
  editor.focus();
}

export function execFormatBlock(editor: HTMLElement, tag: string) {
  if (!tag) return;
  document.execCommand("formatBlock", false, `<${tag}>`);
  editor.focus();
}

export async function inserirTabela(editor: HTMLElement) {
  const confirmou = await popupPrompt("Inserir Tabela", "Defina as dimensões da tabela", [
    { id: "linhas", label: "Linhas", placeholder: "3", valor: "3" },
    { id: "colunas", label: "Colunas", placeholder: "3", valor: "3" },
  ]);
  if (!confirmou) return;

  const linhasInput = document.getElementById("popupInput_linhas") as HTMLInputElement | null;
  const colunasInput = document.getElementById("popupInput_colunas") as HTMLInputElement | null;
  const linhas = parseInt(linhasInput?.value ?? "", 10);
  const colunas = parseInt(colunasInput?.value ?? "", 10);
  if (isNaN(linhas) || isNaN(colunas) || linhas < 1 || colunas < 1) return;

  let html = "<table><thead><tr>";
  for (let c = 0; c < colunas; c++) {
    html += `<th>Coluna ${c + 1}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (let r = 0; r < linhas; r++) {
    html += "<tr>";
    for (let c = 0; c < colunas; c++) {
      html += "<td>&nbsp;</td>";
    }
    html += "</tr>";
  }
  html += "</tbody></table><p><br></p>";

  document.execCommand("insertHTML", false, html);
  editor.focus();
}

export function setupKeyboardShortcuts(editor: HTMLElement): () => void {
  function handler(e: KeyboardEvent) {
    const ativo = document.activeElement;
    if (!editor.contains(ativo) && ativo !== editor) return;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          execCmd(editor, "bold");
          break;
        case "i":
          e.preventDefault();
          execCmd(editor, "italic");
          break;
        case "u":
          e.preventDefault();
          execCmd(editor, "underline");
          break;
      }
    }
  }

  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}
