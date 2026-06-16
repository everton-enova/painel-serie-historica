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

  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoW, setLogoW] = useState(160);
  const [logoH, setLogoH] = useState(70);
  const [lockAspect, setLockAspect] = useState(true);

  // refs para o drag handler acessar valores atuais sem stale closure
  const stateRef = useRef({ logoW: 160, logoH: 70, lockAspect: true, ratio: 160 / 70 });
  useEffect(() => { stateRef.current.logoW = logoW; }, [logoW]);
  useEffect(() => { stateRef.current.logoH = logoH; }, [logoH]);
  useEffect(() => { stateRef.current.lockAspect = lockAspect; }, [lockAspect]);

  function handleLogoClick() {
    fileInputRef.current?.click();
  }

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
      let nw = startW;
      let nh = startH;
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

  useEffect(() => {
    if (!editorRef.current) return;
    return setupKeyboardShortcuts(editorRef.current);
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

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => execCmd(editor, "bold"))} title="Negrito">
            <b>N</b>
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "italic"))} title="Itálico">
            <i>I</i>
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "underline"))} title="Sublinhado">
            <u>S</u>
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "strikeThrough"))} title="Tachado">
            <s>T</s>
          </button>

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => execCmd(editor, "justifyLeft"))} title="Alinhar à esquerda">
            ⬅
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "justifyCenter"))} title="Centralizar">
            ⬛
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "justifyRight"))} title="Alinhar à direita">
            ➡
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "justifyFull"))} title="Justificar">
            ☰
          </button>

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => execCmd(editor, "insertUnorderedList"))} title="Lista com marcadores">
            • Lista
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "insertOrderedList"))} title="Lista numerada">
            1. Lista
          </button>

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => execCmd(editor, "indent"))} title="Aumentar recuo">
            →|
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "outdent"))} title="Diminuir recuo">
            |←
          </button>

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => inserirTabela(editor))} title="Inserir tabela">
            ▦ Tabela
          </button>

          <button onClick={() => comEditor((editor) => execCmd(editor, "insertHorizontalRule"))} title="Linha horizontal">
            ─
          </button>

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => execCmd(editor, "undo"))} title="Desfazer">
            ↩
          </button>
          <button onClick={() => comEditor((editor) => execCmd(editor, "redo"))} title="Refazer">
            ↪
          </button>

          <div className="tb-sep"></div>

          <button onClick={() => comEditor((editor) => execCmd(editor, "removeFormat"))} title="Limpar formatação">
            ✕ Limpar
          </button>
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
                  {/* Caixa de ajuste: aparece quando logo-selected */}
                  <div className="logo-size-panel">
                    <label>W</label>
                    <input
                      type="number"
                      value={logoW}
                      min={20}
                      onChange={(e) => handleWChange(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label>H</label>
                    <input
                      type="number"
                      value={logoH}
                      min={10}
                      onChange={(e) => handleHChange(Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      className={`ls-lock${lockAspect ? " locked" : ""}`}
                      title={lockAspect ? "Proporção travada" : "Proporção livre"}
                      onClick={(e) => { e.stopPropagation(); setLockAspect((v) => !v); }}
                    >
                      {lockAspect ? "🔒" : "🔓"}
                    </button>
                    <button
                      className="ls-lock"
                      title="Trocar imagem"
                      onClick={(e) => { e.stopPropagation(); handleLogoClick(); }}
                    >
                      🖼️
                    </button>
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={logoSrc}
                    alt="Logo"
                    className="logo-img-loaded"
                    style={{ width: logoW, height: logoH }}
                    onLoad={handleLogoLoad}
                  />

                  {/* Alças de resize */}
                  {(["nw","ne","se","sw","e","w"] as const).map((h) => (
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
    </div>
  );
}
