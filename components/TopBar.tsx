"use client";

import type { Modo } from "@/app/page";

interface TopBarProps {
  modoAtual: Modo;
  onTrocarModo: (modo: Modo) => void;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onBuscar: () => void;
  numNota: string;
  onNumNotaChange: (v: string) => void;
  checkSabe: boolean;
  onCheckSabeChange: (v: boolean) => void;
  checkSaeb: boolean;
  onCheckSaebChange: (v: boolean) => void;
  checkSabeRedeMunicipal: boolean;
  onCheckSabeRedeMunicipalChange: (v: boolean) => void;
  checkSabeRedeEstadual: boolean;
  onCheckSabeRedeEstadualChange: (v: boolean) => void;
  checkSaebRedePublica: boolean;
  onCheckSaebRedePublicaChange: (v: boolean) => void;
  checkSaebRedeMunicipal: boolean;
  onCheckSaebRedeMunicipalChange: (v: boolean) => void;
  checkSaebRedeEstadual: boolean;
  onCheckSaebRedeEstadualChange: (v: boolean) => void;
  usuarioLogado: string;
  onImprimir: () => void;
  onSair: () => void;
}

export default function TopBar({
  modoAtual,
  onTrocarModo,
  searchInput,
  onSearchInputChange,
  onBuscar,
  numNota,
  onNumNotaChange,
  checkSabe,
  onCheckSabeChange,
  checkSaeb,
  onCheckSaebChange,
  checkSabeRedeMunicipal,
  onCheckSabeRedeMunicipalChange,
  checkSabeRedeEstadual,
  onCheckSabeRedeEstadualChange,
  checkSaebRedePublica,
  onCheckSaebRedePublicaChange,
  checkSaebRedeMunicipal,
  onCheckSaebRedeMunicipalChange,
  checkSaebRedeEstadual,
  onCheckSaebRedeEstadualChange,
  usuarioLogado,
  onImprimir,
  onSair,
}: TopBarProps) {
  const isMunicipio = modoAtual === "municipio";
  const mostraFiltrosDados = modoAtual !== "documento";

  return (
    <div className="top-bar no-print">
      <div className="filter-group">
        <div className="fw-bold text-primary fs-5">PAINEL</div>
        <div className="vr"></div>

        <div className="mode-tabs">
          <button
            className={`mode-tab ${modoAtual === "escola" ? "active" : ""}`}
            onClick={() => onTrocarModo("escola")}
          >
            🏫 Escola
          </button>
          <button
            className={`mode-tab ${modoAtual === "municipio" ? "active" : ""}`}
            onClick={() => onTrocarModo("municipio")}
          >
            🏛️ Município
          </button>
          <button
            className={`mode-tab ${modoAtual === "documento" ? "active" : ""}`}
            onClick={() => onTrocarModo("documento")}
          >
            📝 Documento
          </button>
        </div>

        {mostraFiltrosDados && (
          <div className="filtros-dados" id="filtrosDados">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="checkSabe"
                    checked={checkSabe}
                    onChange={(e) => onCheckSabeChange(e.target.checked)}
                  />
                  <label htmlFor="checkSabe">SABE</label>
                </div>
                {isMunicipio && checkSabe && (
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
                  </div>
                )}

                <span style={{ color: "#ccc", fontSize: 14 }}>|</span>

                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="checkSaeb"
                    checked={checkSaeb}
                    onChange={(e) => onCheckSaebChange(e.target.checked)}
                  />
                  <label htmlFor="checkSaeb">Saeb</label>
                </div>
                {isMunicipio && checkSaeb && (
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
        )}
      </div>

      <div className="action-group">
        <span className="small text-muted me-2" style={{ whiteSpace: "nowrap" }}>
          Logado: <b id="userDisplay">{usuarioLogado}</b>
        </span>
        <button className="btn btn-success btn-sm fw-bold" onClick={onImprimir}>
          🖨️ PDF / IMPRIMIR
        </button>
        <button className="btn btn-outline-danger btn-sm" onClick={onSair}>
          Sair
        </button>
      </div>
    </div>
  );
}
