"use client";

import { useEffect, useRef } from "react";
import type { Modo } from "@/app/page";
import type { RegionalOpcao } from "@/lib/types";

interface TopBarProps {
  modoAtual: Modo;
  onTrocarModo: (modo: Modo) => void;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onBuscar: () => void;
  regionais: RegionalOpcao[];
  regionalSelecionada: string;
  onRegionalChange: (v: string) => void;
  numNota: string;
  onNumNotaChange: (v: string) => void;
  numDoc: string;
  onNumDocChange: (v: string) => void;
  checkSabe: boolean;
  onCheckSabeChange: (v: boolean) => void;
  checkSaeb: boolean;
  onCheckSaebChange: (v: boolean) => void;
  checkSabeRedeMunicipal: boolean;
  onCheckSabeRedeMunicipalChange: (v: boolean) => void;
  checkSabeRedeEstadual: boolean;
  onCheckSabeRedeEstadualChange: (v: boolean) => void;
  checkSabeRedePublica: boolean;
  onCheckSabeRedePublicaChange: (v: boolean) => void;
  checkSaebRedePublica: boolean;
  onCheckSaebRedePublicaChange: (v: boolean) => void;
  checkSaebRedeMunicipal: boolean;
  onCheckSaebRedeMunicipalChange: (v: boolean) => void;
  checkSaebRedeEstadual: boolean;
  onCheckSaebRedeEstadualChange: (v: boolean) => void;
  usuarioLogado: string;
  salvando: boolean;
  onImprimir: () => void;
  onSair: () => void;
}

export default function TopBar({
  modoAtual,
  onTrocarModo,
  searchInput,
  onSearchInputChange,
  onBuscar,
  regionais,
  regionalSelecionada,
  onRegionalChange,
  numNota,
  onNumNotaChange,
  numDoc,
  onNumDocChange,
  checkSabe,
  onCheckSabeChange,
  checkSaeb,
  onCheckSaebChange,
  checkSabeRedeMunicipal,
  onCheckSabeRedeMunicipalChange,
  checkSabeRedeEstadual,
  onCheckSabeRedeEstadualChange,
  checkSabeRedePublica,
  onCheckSabeRedePublicaChange,
  checkSaebRedePublica,
  onCheckSaebRedePublicaChange,
  checkSaebRedeMunicipal,
  onCheckSaebRedeMunicipalChange,
  checkSaebRedeEstadual,
  onCheckSaebRedeEstadualChange,
  usuarioLogado,
  salvando,
  onImprimir,
  onSair,
}: TopBarProps) {
  const comFiltroRede = modoAtual === "municipio" || modoAtual === "regional";
  const mostraFiltrosDados = modoAtual === "escola" || modoAtual === "municipio" || modoAtual === "regional";
  const docNumRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modoAtual === "documento") {
      setTimeout(() => docNumRef.current?.focus(), 50);
    }
  }, [modoAtual]);

  return (
    <div className="top-bar no-print">
      <div className="filter-group">
        <div className="fw-bold text-primary fs-5">PAINEL</div>
        <div className="vr"></div>

        <div className="mode-tabs">
          <button
            className={`mode-tab ${modoAtual === "bahia" ? "active" : ""}`}
            onClick={() => onTrocarModo("bahia")}
          >
            📊 Bahia
          </button>
          <button
            className={`mode-tab ${modoAtual === "regional" ? "active" : ""}`}
            onClick={() => onTrocarModo("regional")}
          >
            📍 Regional
          </button>
          <button
            className={`mode-tab ${modoAtual === "municipio" ? "active" : ""}`}
            onClick={() => onTrocarModo("municipio")}
          >
            🏛️ Município
          </button>
          <button
            className={`mode-tab ${modoAtual === "escola" ? "active" : ""}`}
            onClick={() => onTrocarModo("escola")}
          >
            🏫 Escola
          </button>
          <button
            className={`mode-tab ${modoAtual === "documento" ? "active" : ""}`}
            onClick={() => onTrocarModo("documento")}
          >
            📝 Documento
          </button>
          <button
            className={`mode-tab ${modoAtual === "recentes" ? "active" : ""}`}
            onClick={() => onTrocarModo("recentes")}
          >
            🕘 Recentes
          </button>
        </div>

        {modoAtual === "bahia" && (
          <div className="input-group input-group-sm" style={{ width: 140 }}>
            <span className="input-group-text">Nota Nº</span>
            <input
              type="text"
              className="form-control"
              placeholder="000"
              value={numNota}
              onChange={(e) => onNumNotaChange(e.target.value)}
            />
          </div>
        )}

        {modoAtual === "documento" && (
          <div className="input-group input-group-sm" style={{ width: 150 }}>
            <span className="input-group-text">Doc Nº</span>
            <input
              ref={docNumRef}
              type="text"
              className="form-control"
              placeholder="000"
              value={numDoc}
              onChange={(e) => onNumDocChange(e.target.value)}
            />
          </div>
        )}

        {mostraFiltrosDados && (
          <div className="filtros-dados" id="filtrosDados">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {modoAtual === "regional" ? (
                <select
                  id="regionalSelect"
                  className="form-select form-select-sm"
                  style={{ width: 300 }}
                  value={regionalSelecionada}
                  onChange={(e) => onRegionalChange(e.target.value)}
                >
                  <option value="">
                    {regionais.length ? "Selecione a Regional (NTE)..." : "Carregando NTEs..."}
                  </option>
                  {regionais.map((r) => (
                    <option key={r.num} value={String(r.num)}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="searchInput"
                  className="form-control form-control-sm"
                  style={{ width: 180 }}
                  placeholder={modoAtual === "escola" ? "Código INEP" : "Código do Município"}
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onBuscar();
                  }}
                />
              )}
              <button className="btn btn-primary btn-sm btn-buscar" onClick={onBuscar}>
                Buscar
              </button>

              <div className="input-group input-group-sm" style={{ width: 140 }}>
                <span className="input-group-text">Nota Nº</span>
                <input
                  type="text"
                  id="numNotaInput"
                  className="form-control"
                  placeholder="000"
                  value={numNota}
                  onChange={(e) => onNumNotaChange(e.target.value)}
                />
              </div>

              <div className="checkbox-group">
                <div className="check-block">
                  <div className="checkbox-item">
                    <input
                      type="checkbox"
                      id="checkSabe"
                      checked={checkSabe}
                      onChange={(e) => onCheckSabeChange(e.target.checked)}
                    />
                    <label htmlFor="checkSabe">SABE</label>
                  </div>
                  {comFiltroRede && checkSabe && (
                    <div className="sub-checkbox-group" id="filtroRedeSabe">
                      <div className="sub-checkbox-item">
                        <input
                          type="checkbox"
                          id="checkSabeRedeMunicipal"
                          checked={checkSabeRedeMunicipal}
                          onChange={(e) => onCheckSabeRedeMunicipalChange(e.target.checked)}
                        />
                        <label htmlFor="checkSabeRedeMunicipal">Municipal</label>
                      </div>
                      <div className="sub-checkbox-item">
                        <input
                          type="checkbox"
                          id="checkSabeRedeEstadual"
                          checked={checkSabeRedeEstadual}
                          onChange={(e) => onCheckSabeRedeEstadualChange(e.target.checked)}
                        />
                        <label htmlFor="checkSabeRedeEstadual">Estadual</label>
                      </div>
                      <div className="sub-checkbox-item">
                        <input
                          type="checkbox"
                          id="checkSabeRedePublica"
                          checked={checkSabeRedePublica}
                          onChange={(e) => onCheckSabeRedePublicaChange(e.target.checked)}
                        />
                        <label htmlFor="checkSabeRedePublica">Pública</label>
                      </div>
                    </div>
                  )}
                </div>

                <span className="check-sep">|</span>

                <div className="check-block">
                  <div className="checkbox-item">
                    <input
                      type="checkbox"
                      id="checkSaeb"
                      checked={checkSaeb}
                      onChange={(e) => onCheckSaebChange(e.target.checked)}
                    />
                    <label htmlFor="checkSaeb">Saeb</label>
                  </div>
                  {comFiltroRede && checkSaeb && (
                    <div className="sub-checkbox-group" id="filtroRedeSaeb">
                      <div className="sub-checkbox-item">
                        <input
                          type="checkbox"
                          id="checkSaebRedePublica"
                          checked={checkSaebRedePublica}
                          onChange={(e) => onCheckSaebRedePublicaChange(e.target.checked)}
                        />
                        <label htmlFor="checkSaebRedePublica">Pública</label>
                      </div>
                      <div className="sub-checkbox-item">
                        <input
                          type="checkbox"
                          id="checkSaebRedeMunicipal"
                          checked={checkSaebRedeMunicipal}
                          onChange={(e) => onCheckSaebRedeMunicipalChange(e.target.checked)}
                        />
                        <label htmlFor="checkSaebRedeMunicipal">Municipal</label>
                      </div>
                      <div className="sub-checkbox-item">
                        <input
                          type="checkbox"
                          id="checkSaebRedeEstadual"
                          checked={checkSaebRedeEstadual}
                          onChange={(e) => onCheckSaebRedeEstadualChange(e.target.checked)}
                        />
                        <label htmlFor="checkSaebRedeEstadual">Estadual</label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="action-group">
        <span className="small text-muted me-2" style={{ whiteSpace: "nowrap" }}>
          Logado: <b id="userDisplay">{usuarioLogado}</b>
        </span>
        <button className="btn btn-success btn-sm fw-bold" onClick={onImprimir} disabled={salvando}>
          {salvando ? "Salvando..." : "🖨️ PDF / IMPRIMIR"}
        </button>
        <button className="btn btn-outline-danger btn-sm" onClick={onSair}>
          Sair
        </button>
      </div>
    </div>
  );
}
