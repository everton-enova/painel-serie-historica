"use client";

import { useEffect, useRef, useState } from "react";
import { aplicarCorTexto, aplicarTamanhoFonte, CORES_TEXTO, execCmd, execFormatBlock, inserirTabela, setupKeyboardShortcuts, TAMANHOS_FONTE } from "@/lib/documentoEditor";
import LogoUpload from "./LogoUpload";
import { nomeArquivoNota } from "@/lib/formatters";

interface DocumentoAreaProps {
  usuarioLogado: string;
  dataFormatada: string;
  numDoc: string;
}

const CONTEUDO_INICIAL = `
  <h1>Título da Seção</h1>
  <p>Clique aqui para editar o conteúdo do documento. Você pode formatar o texto utilizando a barra de ferramentas acima.</p>
  <h2>Subtítulo</h2>
  <p>Adicione parágrafos, listas numeradas, listas com marcadores, tabelas e mais. Todo o conteúdo é editável e pode ser personalizado conforme a necessidade.</p>
  <ol>
    <li>Primeiro item da lista</li>
    <li>Segundo item</li>
    <li>Terceiro item</li>
  </ol>
  <p>Continue editando livremente...</p>
`;

export default function DocumentoArea({ usuarioLogado, dataFormatada, numDoc }: DocumentoAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // ── HTML popup ──
  const [htmlPopupOpen, setHtmlPopupOpen] = useState(false);
  const [htmlInput, setHtmlInput] = useState("");
  const [htmlPreview, setHtmlPreview] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // ── HTML popup handlers ──
  function salvarCursor() {
    const sel = window.getSelection();
    const ed = editorRef.current;
    if (sel && sel.rangeCount && ed && ed.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRangeRef.current = null;
    }
  }

  function abrirPopupHtml() {
    salvarCursor();
    setEditingBlockId(null);
    setHtmlInput("");
    setHtmlPreview(false);
    setHtmlPopupOpen(true);
  }

  function fecharPopupHtml() {
    setHtmlPopupOpen(false);
    setEditingBlockId(null);
    setHtmlInput("");
    setHtmlPreview(false);
  }

  function executarScripts(container: HTMLElement) {
    container.querySelectorAll("script").forEach((s) => {
      const ns = document.createElement("script");
      // Copia TODOS os atributos (src, type, async, defer, charset, crossorigin,
      // e os data-* que embeds como Datawrapper/Flourish/Infogram exigem)
      for (const attr of Array.from(s.attributes)) {
        ns.setAttribute(attr.name, attr.value);
      }
      if (!s.src) ns.textContent = s.textContent;
      s.parentNode?.replaceChild(ns, s);
    });
  }

  // Documento HTML completo (<!doctype>, <html>, <head>, <body>) não pode ser
  // injetado inline — precisa ficar isolado num iframe.
  function ehDocumentoCompleto(html: string) {
    return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html);
  }

  function renderizarConteudo(cnt: HTMLElement, html: string) {
    if (ehDocumentoCompleto(html)) {
      cnt.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.className = "html-block-iframe";
      iframe.style.width = "100%";
      iframe.style.border = "0";
      iframe.style.height = "600px";
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms");
      iframe.addEventListener("load", () => {
        try {
          const doc = iframe.contentDocument;
          if (doc?.documentElement) {
            iframe.style.height = doc.documentElement.scrollHeight + "px";
          }
        } catch {
          /* mantém altura padrão */
        }
      });
      cnt.appendChild(iframe);
      // Em região contentEditable o Chrome só carrega o srcdoc se o iframe já
      // estiver conectado ao documento — por isso setamos após o bloco entrar
      // no editor (rAF dispara depois da inserção síncrona).
      requestAnimationFrame(() => { iframe.srcdoc = html; });
    } else {
      cnt.innerHTML = html;
      executarScripts(cnt);
    }
  }

  function confirmarHtml() {
    const html = htmlInput.trim();
    if (!html) { fecharPopupHtml(); return; }

    // Modo edição: só atualiza o conteúdo do bloco existente
    if (editingBlockId) {
      const block = document.getElementById(editingBlockId);
      const cnt = block?.querySelector(".html-block-content");
      if (cnt) {
        renderizarConteudo(cnt as HTMLElement, html);
      }
      fecharPopupHtml();
      return;
    }

    // Modo inserção: cria bloco e insere na posição do cursor
    const ed = editorRef.current;
    if (!ed) { fecharPopupHtml(); return; }

    const uid = `hb_${Date.now()}`;
    const bloco = document.createElement("div");
    bloco.className = "html-block";
    bloco.contentEditable = "false";
    bloco.id = uid;

    const bar = document.createElement("div");
    bar.className = "html-block-bar";
    bar.innerHTML = `
      <span>&lt;/&gt; HTML incorporado</span>
      <button data-action="edit-block">✎ Editar</button>
      <button class="del-html" data-action="del-block">🗑 Remover</button>
    `;

    const cnt = document.createElement("div");
    cnt.className = "html-block-content";
    renderizarConteudo(cnt, html);

    bloco.appendChild(bar);
    bloco.appendChild(cnt);

    const p = document.createElement("p");
    p.innerHTML = "<br>";

    fecharPopupHtml();

    ed.focus();
    const savedRange = savedRangeRef.current;
    if (savedRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
        const rng = sel.getRangeAt(0);
        rng.deleteContents();
        let ref = rng.startContainer as Node;
        while (ref.parentNode && ref.parentNode !== ed) ref = ref.parentNode;
        if (ref.parentNode === ed) {
          ed.insertBefore(p, ref.nextSibling);
          ed.insertBefore(bloco, p);
        } else {
          ed.appendChild(bloco);
          ed.appendChild(p);
        }
      }
    } else {
      ed.appendChild(bloco);
      ed.appendChild(p);
    }

    // Move cursor para após o bloco
    const sel2 = window.getSelection();
    if (sel2) {
      const rng2 = document.createRange();
      rng2.setStart(p, 0);
      rng2.collapse(true);
      sel2.removeAllRanges();
      sel2.addRange(rng2);
    }
  }

  // ── Efeitos ──
  // Semeia o conteúdo inicial UMA vez. Não usamos dangerouslySetInnerHTML porque,
  // nesta versão do Next, o React reseta o innerHTML do editor a cada re-render,
  // apagando blocos/tabelas/imagens inseridos manualmente no DOM.
  useEffect(() => {
    const ed = editorRef.current;
    if (ed && !ed.dataset.seeded) {
      ed.innerHTML = CONTEUDO_INICIAL;
      ed.dataset.seeded = "1";
    }
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    return setupKeyboardShortcuts(editorRef.current);
  }, []);

  // Delegação de cliques para editar/remover blocos HTML dentro do editor
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const editBtn = target.closest("[data-action='edit-block']");
      if (editBtn) {
        const block = editBtn.closest(".html-block") as HTMLElement;
        const cnt = block?.querySelector(".html-block-content");
        if (block && cnt) {
          const iframe = cnt.querySelector("iframe.html-block-iframe") as HTMLIFrameElement | null;
          setEditingBlockId(block.id);
          setHtmlInput(iframe ? iframe.getAttribute("srcdoc") || "" : cnt.innerHTML);
          setHtmlPreview(false);
          setHtmlPopupOpen(true);
        }
        return;
      }
      const delBtn = target.closest("[data-action='del-block']");
      if (delBtn) {
        delBtn.closest(".html-block")?.remove();
      }
    }
    ed.addEventListener("click", handleClick);
    return () => ed.removeEventListener("click", handleClick);
  }, []);

  function comEditor(fn: (editor: HTMLElement) => void) {
    if (editorRef.current) fn(editorRef.current);
  }

  return (
    <div id="documentoArea">
      <div className="doc-editor-wrapper no-print" id="docToolbarWrapper">
        <div className="doc-toolbar" id="docToolbar">
          <select
            id="formatBlock"
            title="Tipo de bloco"
            defaultValue=""
            onChange={(e) => {
              comEditor((editor) => execFormatBlock(editor, e.target.value));
              e.target.value = "";
            }}
          >
            <option value="">Formatar...</option>
            <option value="P">Parágrafo</option>
            <option value="H1">Título 1</option>
            <option value="H2">Título 2</option>
            <option value="H3">Título 3</option>
            <option value="BLOCKQUOTE">Citação</option>
          </select>

          <select
            id="fontSize"
            title="Tamanho da fonte"
            defaultValue=""
            onChange={(e) => {
              comEditor((editor) => aplicarTamanhoFonte(editor, e.target.value));
              e.target.value = "";
            }}
          >
            <option value="">Tamanho...</option>
            <option value="padrao">Padrão (10pt)</option>
            {TAMANHOS_FONTE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="tb-sep" />

          <div className="tb-cores" title="Cor do texto">
            {CORES_TEXTO.map((cor) => (
              <button
                key={cor}
                type="button"
                className="tb-cor-swatch"
                style={{ background: cor }}
                title={cor}
                aria-label={`Cor ${cor}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => comEditor((editor) => aplicarCorTexto(editor, cor))}
              />
            ))}
            <label className="tb-cor-custom" title="Cor personalizada">
              <i className="bi bi-palette" />
              <input
                type="color"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => comEditor((editor) => aplicarCorTexto(editor, e.target.value))}
              />
            </label>
          </div>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => execCmd(e, "bold"))} title="Negrito"><b>N</b></button>
          <button onClick={() => comEditor((e) => execCmd(e, "italic"))} title="Itálico"><i>I</i></button>
          <button onClick={() => comEditor((e) => execCmd(e, "underline"))} title="Sublinhado"><u>S</u></button>
          <button onClick={() => comEditor((e) => execCmd(e, "strikeThrough"))} title="Tachado"><s>T</s></button>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => execCmd(e, "justifyLeft"))} title="Alinhar à esquerda">
            <i className="bi bi-text-left" />
          </button>
          <button onClick={() => comEditor((e) => execCmd(e, "justifyCenter"))} title="Centralizar">
            <i className="bi bi-text-center" />
          </button>
          <button onClick={() => comEditor((e) => execCmd(e, "justifyRight"))} title="Alinhar à direita">
            <i className="bi bi-text-right" />
          </button>
          <button onClick={() => comEditor((e) => execCmd(e, "justifyFull"))} title="Justificar">
            <i className="bi bi-justify" />
          </button>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => execCmd(e, "insertUnorderedList"))} title="Lista com marcadores">• Lista</button>
          <button onClick={() => comEditor((e) => execCmd(e, "insertOrderedList"))} title="Lista numerada">1. Lista</button>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => execCmd(e, "indent"))} title="Aumentar recuo">→|</button>
          <button onClick={() => comEditor((e) => execCmd(e, "outdent"))} title="Diminuir recuo">|←</button>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => inserirTabela(e))} title="Inserir tabela">▦ Tabela</button>

          <button
            onClick={abrirPopupHtml}
            title="Inserir bloco HTML"
            style={{ color: "#1d4ed8", fontWeight: 700 }}
          >
            &lt;/&gt; HTML
          </button>

          <button onClick={() => comEditor((e) => execCmd(e, "insertHorizontalRule"))} title="Linha horizontal">─</button>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => execCmd(e, "undo"))} title="Desfazer">↩</button>
          <button onClick={() => comEditor((e) => execCmd(e, "redo"))} title="Refazer">↪</button>

          <div className="tb-sep" />

          <button onClick={() => comEditor((e) => execCmd(e, "removeFormat"))} title="Limpar formatação">✕ Limpar</button>
        </div>
      </div>

      <div className="doc-editor-area" id="docEditorPage">
        <header className="header-modern">
          <LogoUpload />
          <div className="header-info">
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
              <h1 className="doc-title-editable">
                {nomeArquivoNota(numDoc, "RESULTADO_SABE_SAEB_")}
                <span id="docTituloEditavel" contentEditable spellCheck suppressContentEditableWarning>
                  DOCUMENTO
                </span>
              </h1>
            </div>
            <div className="header-meta">
              <div>
                <strong>SETOR:</strong>{" "}
                <span contentEditable suppressContentEditableWarning style={{ borderBottom: "1px dashed #ccc" }}>
                  SGINF/DIE/COORDENAÇÃO DE AVALIAÇÃO
                </span>
              </div>
              <div>
                <strong>DATA:</strong>{" "}
                <span id="docDataAtual" contentEditable suppressContentEditableWarning style={{ borderBottom: "1px dashed #ccc" }}>
                  {dataFormatada}
                </span>
              </div>
              <div>
                <strong>RESPONSÁVEL:</strong>{" "}
                <span id="docResponsavel" contentEditable suppressContentEditableWarning style={{ borderBottom: "1px dashed #ccc" }}>
                  {usuarioLogado}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div
          className="doc-body-editable"
          id="docBodyEditavel"
          ref={editorRef}
          contentEditable
          spellCheck
          suppressContentEditableWarning
        />

        <div className="footer-mini">
          <span contentEditable suppressContentEditableWarning>
            Secretaria da Educação do Estado da Bahia • SGINF/DIE/CAV
          </span>
        </div>
      </div>

      {/* ── Popup HTML incorporado ── */}
      {htmlPopupOpen && (
        <div
          className="html-popup-overlay show"
          onClick={(e) => { if (e.target === e.currentTarget) fecharPopupHtml(); }}
        >
          <div className="html-popup-box">
            <div className="html-popup-header">
              <h3>&lt;/&gt; &nbsp;{editingBlockId ? "Editar bloco HTML" : "Inserir bloco HTML"}</h3>
              <span>O HTML será renderizado inline no documento</span>
            </div>

            <div className="html-popup-tabs">
              <button className={`html-popup-tab${!htmlPreview ? " active" : ""}`} onClick={() => setHtmlPreview(false)}>
                Código HTML
              </button>
              <button className={`html-popup-tab${htmlPreview ? " active" : ""}`} onClick={() => setHtmlPreview(true)}>
                Pré-visualização
              </button>
            </div>

            <div className="html-popup-body">
              {!htmlPreview ? (
                <textarea
                  placeholder={"Cole seu HTML aqui.\nEx: <table>...</table>\n    <div style=\"...\">...</div>"}
                  value={htmlInput}
                  onChange={(e) => setHtmlInput(e.target.value)}
                  autoFocus
                />
              ) : ehDocumentoCompleto(htmlInput) ? (
                <iframe
                  className="preview-area"
                  title="Pré-visualização"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  srcDoc={htmlInput}
                  style={{ width: "100%", height: "100%", border: "0" }}
                />
              ) : (
                <div className="preview-area" dangerouslySetInnerHTML={{ __html: htmlInput }} />
              )}
            </div>

            <div className="html-popup-footer">
              <button className="btn-cancel" onClick={fecharPopupHtml}>Cancelar</button>
              <button className="btn-preview" onClick={() => setHtmlPreview((v) => !v)}>
                {htmlPreview ? "← Código" : "Pré-visualizar"}
              </button>
              <button className="btn-insert" onClick={confirmarHtml}>
                {editingBlockId ? "Atualizar bloco" : "Inserir no documento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
