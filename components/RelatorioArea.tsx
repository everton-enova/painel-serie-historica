import { formatarDataAtual } from "@/lib/formatters";
import type { BlocoSabe, BlocoSaeb, InfoEntidade } from "@/lib/types";
import SabeBlock from "./SabeBlock";
import SaebBlock from "./SaebBlock";
import LogoUpload from "./LogoUpload";

interface RelatorioAreaProps {
  info: InfoEntidade;
  tipo: "escola" | "municipio" | "regional";
  numNota: string;
  usuarioLogado: string;
  dadosSabe: BlocoSabe[];
  dadosSaeb: Omit<BlocoSaeb, "raw">[];
  mostrarSabe: boolean;
  mostrarSaeb: boolean;
}

export default function RelatorioArea({
  info,
  tipo,
  numNota,
  usuarioLogado,
  dadosSabe,
  dadosSaeb,
  mostrarSabe,
  mostrarSaeb,
}: RelatorioAreaProps) {
  return (
    <div id="relatorioArea">
      <div className="nota-tecnica" id="conteudoNota">
        <header className="header-modern">
          <LogoUpload />
          <div className="header-info">
            <h1 className="header-title">
              NOTA TÉCNICA <span id="numNotaDisplay">{numNota || "___"}</span>/2026
            </h1>
            <div className="header-meta">
              <div>
                <strong>SETOR:</strong> SGINF/DIE/COORDENAÇÃO DE AVALIAÇÃO
              </div>
              <div>
                <strong>ATUALIZAÇÃO:</strong> <span id="dataAtualizacao">{info.dataAtual || formatarDataAtual()}</span>
              </div>
              <div>
                <strong>RESPONSÁVEL:</strong> <span id="tecnicoResponsavel">{usuarioLogado}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="school-card">
          <div className="school-name" id="nomeEntidade">
            {info.nome}
          </div>
          <div className="school-details">
            <div>
              <span className="school-label" id="labelCodigo">
                {tipo === "escola" ? "INEP:" : tipo === "regional" ? "REGIONAL:" : "CÓD. MUNICÍPIO:"}
              </span>{" "}
              <span id="codigoEntidade">{info.codigo}</span>
            </div>
            <div>
              <span className="school-label">{tipo === "regional" ? "ABRANGÊNCIA:" : "REGIONAL:"}</span>{" "}
              <span id="regionalEntidade">
                {tipo === "escola" ? `${info.regional} – ${info.municipio}` : info.regional}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <strong>OBJETIVO:</strong> Apresentar os resultados do SABE – Sistema de Avaliação Baiano da Educação e
          IDEB/SAEB.
        </div>

        {mostrarSabe && (
          <div id="secaoSabe">
            <div className="section-title">1. DADOS DA SÉRIE HISTÓRICA DO SABE</div>
            <div id="tabelasContainerSabe">
              {dadosSabe.length > 0 ? (
                dadosSabe.map((bloco, idx) => <SabeBlock key={idx} bloco={bloco} />)
              ) : (
                <p className="text-muted">Sem dados SABE para os filtros selecionados.</p>
              )}
            </div>
            <div className="footer-mini">Fonte: Portal SABE • Elaboração: SGINF/CAV</div>
          </div>
        )}

        {mostrarSaeb && (
          <div id="secaoSaeb" style={{ marginTop: 30 }}>
            <div id="conteudoSaeb">
              <div className="section-title">2. RESULTADO DO Ideb/Saeb – 2025</div>
              {dadosSaeb.length > 0 ? (
                dadosSaeb.map((bloco, idx) => <SaebBlock key={idx} bloco={bloco} />)
              ) : (
                <p className="text-muted">Sem dados Saeb para os filtros selecionados.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
