"use client";

import { useEffect } from "react";

// Mantém a reserva de edição da nota aberta viva enquanto o painel estiver com
// ela na tela. A reserva é criada no backend ao abrir a nota (GET /api/notas?id
// &autor) e expira sozinha em ~2min30 — este heartbeat a renova a cada 45s e a
// libera ao trocar de nota, sair do modo ou fechar a aba.
const INTERVALO_HEARTBEAT_MS = 45000;

function avisar(acao: "editando" | "liberar", id: string, autor: string) {
  return fetch("/api/notas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, id, autor }),
    keepalive: true, // sobrevive ao fechamento da aba
  }).catch(() => undefined);
}

export function useTravaEdicao(notaId: string | null, autor: string, ativa: boolean) {
  useEffect(() => {
    if (!notaId || !autor || !ativa) return;

    const timer = setInterval(() => void avisar("editando", notaId, autor), INTERVALO_HEARTBEAT_MS);
    const aoFechar = () => void avisar("liberar", notaId, autor);
    window.addEventListener("pagehide", aoFechar);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", aoFechar);
      void avisar("liberar", notaId, autor);
    };
  }, [notaId, autor, ativa]);
}
