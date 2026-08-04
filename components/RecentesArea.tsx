"use client";

import { useCallback, useEffect, useState } from "react";
import { mostrarPopup, popupAlerta } from "@/lib/popup";
import type { NotaAberta, NotaLixeira, NotaSalvaMeta } from "@/lib/types";

const ROTULOS: Record<string, string> = {
  escola: "Escola",
  municipio: "Município",
  regional: "Regional",
  bahia: "Bahia",
  documento: "Documento",
};

function docHtmlParaDownload(titulo: string, htmlInterno: string): string {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
    titulo +
    "</title><style>" +
    "body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333;margin:24px;}" +
    "table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:10px;}" +
    "th{background:#002060;color:#fff;padding:6px 5px;text-align:center;font-size:8pt;}" +
    "td{padding:6px 5px;border-bottom:1px solid #e0e0e0;text-align:center;}" +
    ".section-title{font-size:10pt;font-weight:bold;color:#002060;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:5px;margin:20px 0 10px;}" +
    ".school-card{background:#f8f9fa;border-left:5px solid #002060;padding:12px;margin-bottom:20px;}" +
    ".school-name{font-size:11pt;font-weight:bold;text-transform:uppercase;}" +
    ".analysis-box{font-size:9.5pt;line-height:1.5;text-align:justify;margin-bottom:12px;}" +
    ".header-title{font-size:16pt;font-weight:bold;color:#002060;text-transform:uppercase;}" +
    ".header-meta{font-size:8pt;color:#666;}" +
    ".badge-nivel{padding:2px 6px;border-radius:10px;font-size:7.5pt;}" +
    ".footer-mini{font-size:7pt;color:#999;text-align:center;margin-top:20px;}" +
    "img{max-width:100%;}" +
    "</style></head><body>" +
    htmlInterno +
    "</body></html>"
  );
}

function nomeArquivo(titulo: string): string {
  return (titulo || "nota").replace(/[\\/:*?"<>|]/g, "-") + ".html";
}

interface RecentesAreaProps {
  onReabrir: (nota: NotaAberta) => void;
  onImprimirNota: (nota: NotaAberta) => void;
  usuarioLogado: string;
}

const INTERVALO_ATUALIZACAO_MS = 30000;

export default function RecentesArea({ onReabrir, onImprimirNota, usuarioLogado }: RecentesAreaProps) {
  const [notas, setNotas] = useState<NotaSalvaMeta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [imprimindo, setImprimindo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState<string | null>(null);

  // Lixeira
  const [verLixeira, setVerLixeira] = useState(false);
  const [lixeira, setLixeira] = useState<NotaLixeira[] | null>(null);
  const [erroLixeira, setErroLixeira] = useState<string | null>(null);

  const carregar = useCallback((silencioso = false) => {
    if (!silencioso) {
      setNotas(null);
      setErro(null);
      setSelecionados(new Set());
    }
    fetch("/api/notas")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) {
          if (!silencioso) setErro(d.erro);
        } else setNotas(d as NotaSalvaMeta[]);
      })
      .catch((e) => {
        if (!silencioso) setErro(e instanceof Error ? e.message : String(e));
      });
  }, []);

  const carregarLixeira = useCallback(() => {
    setLixeira(null);
    setErroLixeira(null);
    fetch("/api/notas?lixeira=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErroLixeira(d.erro);
        else setLixeira(d as NotaLixeira[]);
      })
      .catch((e) => setErroLixeira(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    // Initial + periodic refresh — setState lives inside fetch callbacks (async),
    // the synchronous reset in carregar(false) only runs on user-triggered reloads.
    const ac = new AbortController();
    fetch("/api/notas", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErro(d.erro);
        else setNotas(d as NotaSalvaMeta[]);
      })
      .catch(() => {});
    const t = setInterval(() => carregar(true), INTERVALO_ATUALIZACAO_MS);
    return () => { ac.abort(); clearInterval(t); };
  }, [carregar]);

  useEffect(() => {
    if (!verLixeira) return;
    const ac = new AbortController();
    fetch("/api/notas?lixeira=1", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) setErroLixeira(d.erro);
        else setLixeira(d as NotaLixeira[]);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [verLixeira]);

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    if (!notas) return;
    setSelecionados((atual) =>
      atual.size === notas.length ? new Set() : new Set(notas.map((n) => n.id))
    );
  }

  async function reabrir(id: string) {
    setAbrindo(id);
    try {
      const res = await fetch(
        `/api/notas?id=${encodeURIComponent(id)}&autor=${encodeURIComponent(usuarioLogado)}`
      );
      const dados = await res.json();
      if (dados.erro || !dados.sucesso) {
        popupAlerta("Erro", dados.erro || "Não foi possível abrir a nota.", "error");
        return;
      }
      if (dados.somenteLeitura) {
        popupAlerta(
          "Nota em edição",
          `<b>${dados.editandoPor}</b> está editando esta nota${
            dados.editandoDesde ? " desde " + dados.editandoDesde : ""
          }.<br><br>Ela será aberta <b>somente para leitura</b> — as alterações não poderão ser salvas enquanto a outra edição estiver aberta.`,
          "warning"
        );
        carregar(true);
      }
      onReabrir(dados as NotaAberta);
    } catch (e) {
      popupAlerta("Erro", e instanceof Error ? e.message : String(e), "error");
    } finally {
      setAbrindo(null);
    }
  }

  async function imprimirNota(id: string) {
    setImprimindo(id);
    try {
      const res = await fetch(
        `/api/notas?id=${encodeURIComponent(id)}&autor=${encodeURIComponent(usuarioLogado)}`
      );
      const dados = await res.json();
      if (dados.erro || !dados.sucesso) {
        popupAlerta("Erro", dados.erro || "Não foi possível abrir a nota.", "error");
        return;
      }
      onImprimirNota(dados as NotaAberta);
    } catch (e) {
      popupAlerta("Erro", e instanceof Error ? e.message : String(e), "error");
    } finally {
      setImprimindo(null);
    }
  }

  async function excluirVarios(ids: string[]) {
    const ok = await mostrarPopup({
      tipo: "warning",
      titulo: ids.length > 1 ? `Excluir ${ids.length} notas` : "Excluir nota",
      mensagem:
        ids.length > 1
          ? `Mover as ${ids.length} notas selecionadas para a lixeira? Elas serão excluídas automaticamente após 7 dias.`
          : "Mover esta nota para a lixeira? Ela será excluída automaticamente após 7 dias.",
      botoes: [
        { texto: "Cancelar", classe: "popup-btn-cancel", valor: false },
        { texto: "Mover para lixeira", classe: "popup-btn-danger", valor: true },
      ],
    });
    if (!ok) return;
    setProcessando("Excluindo...");
    const falhas: string[] = [];
    try {
      for (const id of ids) {
        try {
          const res = await fetch("/api/notas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "excluir", id }),
          });
          const dados = await res.json();
          if (dados.erro) falhas.push(dados.erro);
        } catch (e) {
          falhas.push(e instanceof Error ? e.message : String(e));
        }
      }
    } finally {
      setProcessando(null);
    }
    if (falhas.length) popupAlerta("Erro ao excluir", falhas.join("<br>"), "error");
    carregar();
  }

  async function restaurarVarios(ids: string[]) {
    setProcessando("Restaurando...");
    const falhas: string[] = [];
    try {
      for (const id of ids) {
        try {
          const res = await fetch("/api/notas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "restaurar", id }),
          });
          const dados = await res.json();
          if (dados.erro) falhas.push(dados.erro);
        } catch (e) {
          falhas.push(e instanceof Error ? e.message : String(e));
        }
      }
    } finally {
      setProcessando(null);
    }
    if (falhas.length) popupAlerta("Erro ao restaurar", falhas.join("<br>"), "error");
    carregarLixeira();
    carregar(true);
  }

  async function excluirDefinitivoVarios(ids: string[]) {
    const ok = await mostrarPopup({
      tipo: "warning",
      titulo: ids.length > 1 ? `Excluir ${ids.length} notas definitivamente` : "Excluir definitivamente",
      mensagem:
        ids.length > 1
          ? `Excluir permanentemente as ${ids.length} notas selecionadas? Esta ação não pode ser desfeita.`
          : "Excluir esta nota permanentemente? Esta ação não pode ser desfeita.",
      botoes: [
        { texto: "Cancelar", classe: "popup-btn-cancel", valor: false },
        { texto: "Excluir permanentemente", classe: "popup-btn-danger", valor: true },
      ],
    });
    if (!ok) return;
    setProcessando("Excluindo...");
    const falhas: string[] = [];
    try {
      for (const id of ids) {
        try {
          const res = await fetch("/api/notas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acao: "excluirDefinitivo", id }),
          });
          const dados = await res.json();
          if (dados.erro) falhas.push(dados.erro);
        } catch (e) {
          falhas.push(e instanceof Error ? e.message : String(e));
        }
      }
    } finally {
      setProcessando(null);
    }
    if (falhas.length) popupAlerta("Erro ao excluir", falhas.join("<br>"), "error");
    carregarLixeira();
  }

  async function baixarVarios(ids: string[]) {
    setProcessando("Baixando...");
    const falhas: string[] = [];
    try {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/notas?id=${encodeURIComponent(id)}`);
          const dados = await res.json();
          if (dados.erro || !dados.sucesso) {
            falhas.push(dados.erro || "Nota não encontrada.");
            continue;
          }
          const blob = new Blob([docHtmlParaDownload(dados.titulo, dados.html)], {
            type: "text/html;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = nomeArquivo(dados.titulo);
          document.body.appendChild(a);
          a.click();
          a.remove();
          await new Promise((r) => setTimeout(r, 400));
          URL.revokeObjectURL(url);
        } catch (e) {
          falhas.push(e instanceof Error ? e.message : String(e));
        }
      }
    } finally {
      setProcessando(null);
    }
    if (falhas.length) popupAlerta("Erro ao baixar", falhas.join("<br>"), "error");
  }

  const idsSelecionados = Array.from(selecionados);
  const todosMarcados = notas !== null && notas.length > 0 && selecionados.size === notas.length;

  return (
    <div id="recentesArea">
      <div className="nota-tecnica recentes-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div className="section-title" style={{ marginTop: 0, marginBottom: 0, flex: 1 }}>
            {verLixeira ? "🗑️ LIXEIRA" : "🕘 NOTAS SALVAS"}
          </div>
          <button
            className={`btn btn-sm ${verLixeira ? "btn-outline-primary" : "btn-outline-secondary"}`}
            onClick={() => {
              setVerLixeira(!verLixeira);
              setSelecionados(new Set());
            }}
          >
            {verLixeira ? "← Voltar para Recentes" : "🗑️ Lixeira"}
          </button>
        </div>

        {!verLixeira && (
          <>
            <p className="text-muted" style={{ fontSize: "8.5pt" }}>
              Notas gravadas no Drive. <b>Editar</b> carrega a nota de volta para edição; ao clicar em PDF/Imprimir ela é
              salva de novo, sobrescrevendo a mesma nota.
            </p>
            {erro && <p className="text-danger">Erro ao listar: {erro}</p>}
            {!erro && notas === null && <p className="text-muted">Carregando...</p>}
            {!erro && notas !== null && notas.length === 0 && (
              <p className="text-muted">Nenhuma nota salva ainda. Gere uma nota e clique em 🖨️ PDF / IMPRIMIR.</p>
            )}
            {!erro && notas !== null && notas.length > 0 && (
              <>
                <div className="recentes-toolbar">
                  <span className="text-muted" style={{ fontSize: "8.5pt" }}>
                    {selecionados.size > 0
                      ? `${selecionados.size} selecionada${selecionados.size > 1 ? "s" : ""}`
                      : "Marque as caixas para agir sobre várias notas de uma vez."}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      disabled={selecionados.size === 0 || processando !== null}
                      onClick={() => baixarVarios(idsSelecionados)}
                    >
                      {processando === "Baixando..." ? "Baixando..." : "⬇ Baixar selecionadas"}
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      disabled={selecionados.size === 0 || processando !== null}
                      onClick={() => excluirVarios(idsSelecionados)}
                    >
                      {processando === "Excluindo..." ? "Excluindo..." : "🗑 Excluir selecionadas"}
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr className="sub-header">
                        <th style={{ width: 34 }}>
                          <input
                            type="checkbox"
                            checked={todosMarcados}
                            onChange={alternarTodos}
                            title="Selecionar todas"
                          />
                        </th>
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
                          <td>
                            <input
                              type="checkbox"
                              checked={selecionados.has(n.id)}
                              onChange={() => alternarSelecao(n.id)}
                            />
                          </td>
                          <td style={{ textAlign: "left" }}>
                            <strong>{n.titulo}</strong>
                            {n.editandoPor && n.editandoPor !== usuarioLogado && (
                              <div style={{ fontSize: "8pt", color: "#b8860b", marginTop: 2 }}>
                                🔒 {n.editandoPor} está editando
                                {n.editandoDesde ? ` desde ${n.editandoDesde}` : ""}
                              </div>
                            )}
                            {n.editandoPor && n.editandoPor === usuarioLogado && (
                              <div style={{ fontSize: "8pt", color: "#198754", marginTop: 2 }}>
                                ✏ Você está com esta nota aberta
                              </div>
                            )}
                          </td>
                          <td>{ROTULOS[n.tipo] || n.tipo}</td>
                          <td style={{ textAlign: "left" }}>{n.entidade || "-"}</td>
                          <td>{n.autor || "-"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{n.atualizadoEm || "-"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {(() => {
                              const ocupada = !!n.editandoPor && n.editandoPor !== usuarioLogado;
                              return (
                                <button
                                  className={ocupada ? "btn btn-outline-secondary btn-sm" : "btn btn-primary btn-sm"}
                                  disabled={abrindo === n.id}
                                  title={ocupada ? `${n.editandoPor} está editando — abre só para leitura` : undefined}
                                  onClick={() => reabrir(n.id)}
                                >
                                  {abrindo === n.id ? "Abrindo..." : ocupada ? "👁 Ler" : "✏ Editar"}
                                </button>
                              );
                            })()}{" "}
                            <button
                              className="btn btn-success btn-sm"
                              disabled={imprimindo === n.id}
                              onClick={() => imprimirNota(n.id)}
                              title="Abrir para impressão / PDF"
                            >
                              {imprimindo === n.id ? "..." : "🖨️ PDF"}
                            </button>{" "}
                            <button className="btn btn-outline-danger btn-sm" onClick={() => excluirVarios([n.id])}>
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {verLixeira && (
          <>
            <p className="text-muted" style={{ fontSize: "8.5pt" }}>
              Notas excluídas ficam aqui por <b>7 dias</b> antes de serem apagadas definitivamente.
              Você pode restaurá-las ou excluí-las de vez.
            </p>
            {erroLixeira && <p className="text-danger">Erro ao listar: {erroLixeira}</p>}
            {!erroLixeira && lixeira === null && <p className="text-muted">Carregando...</p>}
            {!erroLixeira && lixeira !== null && lixeira.length === 0 && (
              <p className="text-muted">A lixeira está vazia.</p>
            )}
            {!erroLixeira && lixeira !== null && lixeira.length > 0 && (
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr className="sub-header">
                      <th style={{ textAlign: "left" }}>Título</th>
                      <th>Tipo</th>
                      <th>Autor</th>
                      <th>Excluído em</th>
                      <th>Expira em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lixeira.map((n) => (
                      <tr key={n.id}>
                        <td style={{ textAlign: "left" }}>
                          <strong>{n.titulo}</strong>
                        </td>
                        <td>{ROTULOS[n.tipo] || n.tipo}</td>
                        <td>{n.autor || "-"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{n.excluidoEm}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span style={{ color: n.diasRestantes <= 2 ? "#dc3545" : "#6c757d", fontWeight: n.diasRestantes <= 2 ? 700 : 400 }}>
                            {n.diasRestantes} dia{n.diasRestantes !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            className="btn btn-outline-success btn-sm"
                            disabled={processando !== null}
                            onClick={() => restaurarVarios([n.id])}
                          >
                            ↩ Restaurar
                          </button>{" "}
                          <button
                            className="btn btn-outline-danger btn-sm"
                            disabled={processando !== null}
                            onClick={() => excluirDefinitivoVarios([n.id])}
                          >
                            ✕ Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
