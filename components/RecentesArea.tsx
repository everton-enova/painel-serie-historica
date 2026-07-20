"use client";

import { useCallback, useEffect, useState } from "react";
import { mostrarPopup, popupAlerta } from "@/lib/popup";
import type { NotaAberta, NotaSalvaMeta } from "@/lib/types";

const ROTULOS: Record<string, string> = {
  escola: "Escola",
  municipio: "Município",
  regional: "Regional",
  bahia: "Bahia",
  documento: "Documento",
};

interface RecentesAreaProps {
  onReabrir: (nota: NotaAberta) => void;
}

export default function RecentesArea({ onReabrir }: RecentesAreaProps) {
  const [notas, setNotas] = useState<NotaSalvaMeta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setNotas(null);
    setErro(null);
    fetch("/api/notas")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else setNotas(d as NotaSalvaMeta[]);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function reabrir(id: string) {
    setAbrindo(id);
    try {
      const res = await fetch(`/api/notas?id=${encodeURIComponent(id)}`);
      const dados = await res.json();
      if (dados.erro || !dados.sucesso) {
        popupAlerta("Erro", dados.erro || "Não foi possível abrir a nota.", "error");
        return;
      }
      onReabrir(dados as NotaAberta);
    } catch (e) {
      popupAlerta("Erro", e instanceof Error ? e.message : String(e), "error");
    } finally {
      setAbrindo(null);
    }
  }

  async function excluir(id: string) {
    const ok = await mostrarPopup({
      tipo: "warning",
      titulo: "Excluir nota",
      mensagem: "Excluir esta nota salva? Os arquivos HTML e PDF vão para a lixeira do Drive.",
      botoes: [
        { texto: "Cancelar", classe: "popup-btn-cancel", valor: false },
        { texto: "Excluir", classe: "popup-btn-danger", valor: true },
      ],
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "excluir", id }),
      });
      const dados = await res.json();
      if (dados.erro) popupAlerta("Erro", dados.erro, "error");
      carregar();
    } catch (e) {
      popupAlerta("Erro", e instanceof Error ? e.message : String(e), "error");
    }
  }

  return (
    <div id="recentesArea">
      <div className="nota-tecnica" style={{ minHeight: "auto" }}>
        <div className="section-title" style={{ marginTop: 0 }}>🕘 NOTAS SALVAS</div>
        <p className="text-muted" style={{ fontSize: "8.5pt" }}>
          Notas gravadas no Drive. <b>Editar</b> carrega a nota de volta para edição; ao clicar em PDF/Imprimir ela é
          salva de novo, sobrescrevendo a mesma nota.
        </p>
        {erro && <p className="text-danger">Erro ao listar: {erro}</p>}
        {!erro && notas === null && <p className="text-muted">Carregando...</p>}
        {!erro && notas !== null && notas.length === 0 && (
          <p className="text-muted">Nenhuma nota salva ainda. Gere uma nota e use o botão 💾 Salvar.</p>
        )}
        {!erro && notas !== null && notas.length > 0 && (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr className="sub-header">
                  <th style={{ textAlign: "left" }}>Título</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: "left" }}>Entidade</th>
                  <th>Autor</th>
                  <th>Atualizado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => (
                  <tr key={n.id}>
                    <td style={{ textAlign: "left" }}>
                      <strong>{n.titulo}</strong>
                    </td>
                    <td>{ROTULOS[n.tipo] || n.tipo}</td>
                    <td style={{ textAlign: "left" }}>{n.entidade || "-"}</td>
                    <td>{n.autor || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{n.atualizadoEm || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={abrindo === n.id}
                        onClick={() => reabrir(n.id)}
                      >
                        {abrindo === n.id ? "Abrindo..." : "✏ Editar"}
                      </button>{" "}
                      {n.urlPdf && (
                        <a className="btn btn-outline-secondary btn-sm" href={n.urlPdf} target="_blank" rel="noreferrer">
                          PDF
                        </a>
                      )}{" "}
                      <button className="btn btn-outline-danger btn-sm" onClick={() => excluir(n.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
