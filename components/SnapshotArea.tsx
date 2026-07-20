"use client";

import type { NotaAberta } from "@/lib/types";

/**
 * Renderiza o snapshot HTML de uma nota salva (reaberta da tela Recentes).
 * O conteúdo preserva os atributos contenteditable originais, então os
 * textos de análise continuam editáveis; salvar de novo sobrescreve a nota.
 */
export default function SnapshotArea({ nota }: { nota: NotaAberta }) {
  const classe = nota.tipo === "documento" ? "doc-editor-area" : "nota-tecnica";
  return (
    <div id="relatorioArea">
      <div className={classe} id="conteudoNotaSnapshot" dangerouslySetInnerHTML={{ __html: nota.html }} />
    </div>
  );
}
