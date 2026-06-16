"use client";

import { useEffect, useRef, useState } from "react";
import { execCmd, execFormatBlock, inserirTabela, setupKeyboardShortcuts } from "@/lib/documentoEditor";

interface DocumentoAreaProps {
  usuarioLogado: string;
  dataFormatada: string;
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

export default function DocumentoArea({ usuarioLogado, dataFormatada }: DocumentoAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ── Logo ──
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoW, setLogoW] = useState(160);
  const [logoH, setLogoH] = useState(70);
  const [lockAspect, setLockAspect] = useState(true);
  const stateRef = useRef({ logoW: 160, logoH: 70, lockAspect: true, ratio: 160 / 70 });
  useEffect(() => { stateRef.current.logoW = logoW; }, [logoW]);
  useEffect(() => { stateRef.current.logoH = logoH; }, [logoH]);
  useEffect(() => { stateRef.current.lockAspect = lockAspect; }, [lockAspect]);

  // ── HTML popup ──
  const [htmlPopupOpen, setHtmlPopupOpen] = useState(false);
  const [htmlInput, setHtmlInput] = useState("");
  const [htmlPreview, setHtmlPreview] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // ── Logo handlers ──
  function handleLogoClick() { fileInputRef.current?.click(); }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleLogoLoad() {
    const img = imgRef.current;
    if (!img) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    const h = 70;
    const w = Math.round(h * ratio);
    stateRef.current.ratio = ratio;
    setLogoH(h);
    setLogoW(w);
  }

  function handleClearLogo(e: React.MouseEvent) {
    e.stopPropagation();
    setLogoSrc(null);
  }

  function handleWChange(val: number) {
    const v = Math.max(20, val);
    setLogoW(v);
    if (stateRef.current.lockAspect) setLogoH(Math.round(v / stateRef.current.ratio));
  }

  function handleHChange(val: number) {
    const v = Math.max(10, val);
    setLogoH(v);
    if (stateRef.current.lockAspect) setLogoW(Math.round(v * stateRef.current.ratio));
  }

  function startResize(e: React.PointerEvent<HTMLSpanElement>, handle: string) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = stateRef.current.logoW;
    const startH = stateRef.current.logoH;
    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let nw = startW, nh = startH;
      if (handle.includes("e")) nw = Math.max(20, startW + dx);
      if (handle.includes("w")) nw = Math.max(20, startW - dx);
      if (handle.includes("s")) nh = Math.max(10, startH + dy);
      if (handle.includes("n")) nh = Math.max(10, startH - dy);
      if (stateRef.current.lockAspect) {
        if (handle === "e" || handle === "w") nh = Math.round(nw / stateRef.current.ratio);
        else nw = Math.round(nh * stateRef.current.ratio);
      }
      setLogoW(nw);
      setLogoH(nh);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

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
      if (s.src) ns.src = s.src;
      else ns.textContent = s.textContent;
      s.parentNode?.replaceChild(ns, s);
    });
  }

  function confirmarHtml() {
    const html = htmlInput.trim();
    if (!html) { fecharPopupHtml(); return; }

    // Modo edição: só atualiza o conteúdo do bloco existente
    if (editingBlockId) {
      const block = document.getElementById(editingBlockId);
      const cnt = block?.querySelector(".html-block-content");
      if (cnt) {
        cnt.innerHTML = html;
        executarScripts(cnt as HTMLElement);
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
    cnt.innerHTML = html;
    executarScripts(cnt);

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
          setEditingBlockId(block.id);
          setHtmlInput(cnt.innerHTML);
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
          <div className="header-logo">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoChange}
            />
            <div
              className={`logo-upload-wrap${logoSrc ? " logo-selected" : ""}`}
              onClick={!logoSrc ? handleLogoClick : undefined}
              title={!logoSrc ? "Clique para adicionar logo" : undefined}
            >
              {logoSrc ? (
                <>
                  <div className="logo-size-panel">
                    <label>W</label>
                    <input type="number" value={logoW} min={20} onChange={(e) => handleWChange(Number(e.target.value))} onClick={(e) => e.stopPropagation()} />
                    <label>H</label>
                    <input type="number" value={logoH} min={10} onChange={(e) => handleHChange(Number(e.target.value))} onClick={(e) => e.stopPropagation()} />
                    <button className={`ls-lock${lockAspect ? " locked" : ""}`} title={lockAspect ? "Proporção travada" : "Proporção livre"} onClick={(e) => { e.stopPropagation(); setLockAspect((v) => !v); }}>
                      {lockAspect ? "🔒" : "🔓"}
                    </button>
                    <button className="ls-lock" title="Trocar imagem" onClick={(e) => { e.stopPropagation(); handleLogoClick(); }}>
                      🖼️
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={imgRef} src={logoSrc} alt="Logo" className="logo-img-loaded" style={{ width: logoW, height: logoH }} onLoad={handleLogoLoad} />
                  {(["nw", "ne", "se", "sw", "e", "w"] as const).map((h) => (
                    <span key={h} className={`logo-resize-handle ${h}`} onPointerDown={(e) => startResize(e, h)} />
                  ))}
                  <button className="logo-clear-btn visible" onClick={handleClearLogo}>×</button>
                </>
              ) : (
                <div className="logo-placeholder">
                  <span className="lp-icon">🖼️</span>
                  <span className="lp-text">Adicionar logo</span>
                  <span className="lp-sub">clique para subir</span>
                </div>
              )}
            </div>
          </div>
          <div className="header-info">
            <h1 className="doc-title-editable" id="docTituloEditavel" contentEditable spellCheck suppressContentEditableWarning>
              DOCUMENTO
            </h1>
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
          dangerouslySetInnerHTML={{ __html: CONTEUDO_INICIAL }}
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
