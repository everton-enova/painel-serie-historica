import { formatar, formatarEtapaCompleta } from "@/lib/formatters";
import { gerarTextoAnaliseSaeb } from "@/lib/textoAnalise";
import type { BlocoSaeb } from "@/lib/types";

export default function SaebBlock({ bloco }: { bloco: Omit<BlocoSaeb, "raw"> }) {
  const dados = [...bloco.dadosAnos].sort((a, b) => a.ano - b.ano);
  const qtdLinhas = dados.length;
  const etapaExtensa = formatarEtapaCompleta(bloco.etapa);
  const atual = dados[dados.length - 1];
  const anterior = dados[dados.length - 2];
  const textoAnalise = gerarTextoAnaliseSaeb(etapaExtensa, bloco.rede, atual, anterior);

  return (
    <div className="no-break mb-5">
      <div style={{ fontWeight: 700, color: "#002060", marginBottom: 5 }}>{etapaExtensa}</div>
      <div className="analysis-box" contentEditable suppressContentEditableWarning>
        {textoAnalise}
      </div>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th colSpan={9}>
                RESULTADO SAEB - {etapaExtensa} – REDE {bloco.rede}
              </th>
            </tr>
            <tr className="sub-header">
              <th style={{ width: "20%" }}>Município</th>
              <th style={{ width: "15%" }}>Rede</th>
              <th>Edição</th>
              <th>Rendimento (P)</th>
              <th>Matemática</th>
              <th>Português</th>
              <th>Média (N)</th>
              <th>IDEB</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d, idx) => (
              <tr key={d.ano}>
                {idx === 0 && (
                  <>
                    <td rowSpan={qtdLinhas} className="cell-merged">
                      {bloco.municipio}
                    </td>
                    <td rowSpan={qtdLinhas} className="cell-merged">
                      {bloco.rede}
                    </td>
                  </>
                )}
                <td>{d.ano}</td>
                <td>{formatar(d.ir)}</td>
                <td>{formatar(d.mat)}</td>
                <td>{formatar(d.lp)}</td>
                <td>{formatar(d.mp)}</td>
                <td className="highlight-cell">{formatar(d.ideb, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="footer-mini">Fonte: MEC/Inep • Elaboração: SGINF/DIE/CAV</div>
    </div>
  );
}
