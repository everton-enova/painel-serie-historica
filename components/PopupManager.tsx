"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { fecharPopup, registerPopupManager, type PopupOptions } from "@/lib/popup";

const ICONES: Record<string, string> = {
  error: "✕",
  warning: "⚠",
  success: "✓",
  info: "ℹ",
  input: "✎",
};

export default function PopupManager() {
  const [opts, setOpts] = useState<PopupOptions | null>(null);

  useEffect(() => registerPopupManager(setOpts, () => setOpts(null)), []);

  useEffect(() => {
    if (!opts?.inputs?.length) return;
    const timer = setTimeout(() => {
      const first = document.querySelector<HTMLInputElement>(".popup-input-row input");
      first?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [opts]);

  if (!opts) return null;

  const tipo = opts.tipo || "info";
  const botoes = opts.botoes || [{ texto: "OK", classe: "popup-btn-primary", valor: true }];

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const last = botoes[botoes.length - 1];
      fecharPopup(last.valor);
    }
  }

  return (
    <div
      id="popupOverlay"
      className="popup-overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) fecharPopup(null);
      }}
    >
      <div id="popupBox" className="popup-box">
        <div className="popup-header">
          <div className={`popup-icon ${tipo}`}>{ICONES[tipo] || "ℹ"}</div>
          <div className="popup-header-text">
            <h3>{opts.titulo || "Aviso"}</h3>
            {opts.subtitulo && <p>{opts.subtitulo}</p>}
          </div>
        </div>
        <div className="popup-body">
          {opts.mensagem && <p dangerouslySetInnerHTML={{ __html: opts.mensagem }} />}
          {opts.inputs && opts.inputs.length > 0 && (
            <div className="popup-input-row">
              {opts.inputs.map((inp) => (
                <div style={{ flex: 1 }} key={inp.id}>
                  <label>{inp.label}</label>
                  <input
                    type="text"
                    id={`popupInput_${inp.id}`}
                    placeholder={inp.placeholder || ""}
                    defaultValue={inp.valor || ""}
                    onKeyDown={handleInputKeyDown}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="popup-footer">
          {botoes.map((b, i) => (
            <button
              key={i}
              className={`popup-btn ${b.classe || "popup-btn-primary"}`}
              onClick={() => fecharPopup(b.valor)}
            >
              {b.texto}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
