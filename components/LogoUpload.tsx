"use client";

import { useRef, useState } from "react";

export default function LogoUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>("/logo_estado.png");
  const [logoW, setLogoW] = useState(160);
  const [logoH, setLogoH] = useState(70);
  const [lockAspect, setLockAspect] = useState(true);

  // Valores atuais para drag handlers (sem stale closure)
  const ctx = useRef({ w: 160, h: 70, lock: true, ratio: 1 });

  function setDims(w: number, h: number) {
    ctx.current.w = w;
    ctx.current.h = h;
    setLogoW(w);
    setLogoH(h);
  }

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
    const h = 70, w = Math.round(h * ratio);
    ctx.current.ratio = ratio;
    setDims(w, h);
  }

  function handleClearLogo(e: React.MouseEvent) {
    e.stopPropagation();
    setLogoSrc(null);
  }

  function handleWChange(val: number) {
    const v = Math.max(20, val);
    setDims(v, ctx.current.lock ? Math.round(v / ctx.current.ratio) : ctx.current.h);
  }

  function handleHChange(val: number) {
    const v = Math.max(10, val);
    setDims(ctx.current.lock ? Math.round(v * ctx.current.ratio) : ctx.current.w, v);
  }

  function toggleLock(e: React.MouseEvent) {
    e.stopPropagation();
    ctx.current.lock = !ctx.current.lock;
    setLockAspect(ctx.current.lock);
  }

  function startResize(e: React.PointerEvent<HTMLSpanElement>, handle: string) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startW = ctx.current.w, startH = ctx.current.h;

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let nw = startW, nh = startH;
      if (handle.includes("e")) nw = Math.max(20, startW + dx);
      if (handle.includes("w")) nw = Math.max(20, startW - dx);
      if (handle.includes("s")) nh = Math.max(10, startH + dy);
      if (handle.includes("n")) nh = Math.max(10, startH - dy);
      if (ctx.current.lock) {
        if (handle === "e" || handle === "w") nh = Math.round(nw / ctx.current.ratio);
        else nw = Math.round(nh * ctx.current.ratio);
      }
      setDims(nw, nh);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="header-logo">
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
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
              <button className={`ls-lock${lockAspect ? " locked" : ""}`} title={lockAspect ? "Proporção travada" : "Proporção livre"} onClick={toggleLock}>
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
  );
}
