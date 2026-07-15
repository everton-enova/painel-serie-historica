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

/** Tamanhos de fonte predefinidos (em pt) para o seletor da barra de ferramentas. */
export const TAMANHOS_FONTE = ["8pt", "9pt", "10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt", "36pt"];

/**
 * Aplica um tamanho de fonte à seleção atual.
 * Usa o truque do fontSize="7" como marcador e depois substitui pelo
 * font-size em pt desejado, funcionando com seleções parciais.
 */
export function aplicarTamanhoFonte(editor: HTMLElement, tamanho: string) {
  if (!tamanho) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) {
    editor.focus();
    return;
  }
  // styleWithCSS = false garante que o comando gere <font size="7">,
  // usado como marcador para depois aplicar o tamanho em pt desejado.
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand("fontSize", false, "7");
  editor.querySelectorAll('font[size="7"]').forEach((el) => {
    const font = el as HTMLElement;
    font.removeAttribute("size");
    font.style.fontSize = tamanho;
  });
  editor.focus();
}

/** Cores predefinidas para o seletor de cor do texto. */
export const CORES_TEXTO = [
  "#000000",
  "#002060",
  "#c62828",
  "#1565c0",
  "#2e7d32",
  "#ef6c00",
  "#6a1b9a",
  "#555555",
];

/** Aplica uma cor de fonte à seleção atual. */
export function aplicarCorTexto(editor: HTMLElement, cor: string) {
  if (!cor) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) {
    editor.focus();
    return;
  }
  document.execCommand("styleWithCSS", false, "true");
  document.execCommand("foreColor", false, cor);
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
