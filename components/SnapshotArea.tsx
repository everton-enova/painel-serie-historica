"use client";

import { useEffect, useRef } from "react";
import type { NotaAberta } from "@/lib/types";

/**
 * Renderiza o snapshot HTML de uma nota salva (reaberta da tela Recentes).
 * O conteúdo preserva os atributos contenteditable originais, então os
 * textos de análise continuam editáveis; salvar de novo sobrescreve a nota.
 *
 * Quando outra pessoa está com a nota aberta (nota.somenteLeitura), os campos
 * editáveis são desligados e uma faixa avisa quem está editando.
 */
export default function SnapshotArea({ nota }: { nota: NotaAberta }) {
  const classe = nota.tipo === "documento" ? "doc-editor-area" : "nota-tecnica";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nota.somenteLeitura || !ref.current) return;
    ref.current.querySelectorAll("[contenteditable]").forEach((el) => {
      (el as HTMLElement).contentEditable = "false";
    });
  }, [nota.somenteLeitura, nota.html]);

  return (
    <div id="relatorioArea">
      {nota.somenteLeitura && (
        <div
          className="alert alert-warning d-print-none"
          style={{ fontSize: "9pt", marginBottom: 10 }}
        >
          🔒 <b>{nota.editandoPor || "Outro usuário"}</b> está editando esta nota
          {nota.editandoDesde ? ` desde ${nota.editandoDesde}` : ""}. Ela está aberta{" "}
          <b>somente para leitura</b> — nada será salvo nos Recentes.
        </div>
      )}
      <div
        ref={ref}
        className={classe}
        id="conteudoNotaSnapshot"
        dangerouslySetInnerHTML={{ __html: nota.html }}
      />
    </div>
  );
}
