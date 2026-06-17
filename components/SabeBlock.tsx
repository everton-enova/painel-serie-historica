import { formatar, formatarEtapaCompleta, formatarPercentual } from "@/lib/formatters";
import { gerarTextoAnaliseSabe } from "@/lib/textoAnalise";
import type { BlocoSabe } from "@/lib/types";

function SetaDiff({ v }: { v: string | null }) {
  if (!v) return <>-</>;
  const n = Number(v);
  if (n > 0) return <span className="seta-up">▲</span>;
  if (n < 0) return <span className="seta-down">▼</span>;
  return <span className="seta-equal">●</span>;
}

function BadgeNivel({ texto }: { texto: string }) {
  if (!texto || texto === "-") return <>-</>;
  const t = texto.toLowerCase();
  let classe = "";
  if (t.includes("abaixo")) classe = "nv-abaixo";
  else if (t.includes("básico")) classe = "nv-basico";
  else if (t.includes("adequado")) classe = "nv-adequado";
  else if (t.includes("avançado")) classe = "nv-avancado";
  return <span className={`badge-nivel ${classe}`}>{texto}</span>;
}

export default function SabeBlock({ bloco }: { bloco: BlocoSabe }) {
  const linhas = [...bloco.linhas].sort((a, b) => a.edicao - b.edicao);
  const ultimoAno = linhas[linhas.length - 1];
  const etapaExtensa = formatarEtapaCompleta(bloco.etapa);
  const textoAnalise = gerarTextoAnaliseSabe(etapaExtensa, bloco.rede, ultimoAno);

  return (
    <div className="no-break mb-5">
      <div style={{ fontWeight: 700, color: "#002060", marginBottom: 5 }}>
        {etapaExtensa} – REDE {bloco.rede}
      </div>
      <div className="analysis-box" contentEditable suppressContentEditableWarning>
        {textoAnalise}
      </div>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th colSpan={8}>
                RESULTADO SABE - {etapaExtensa} – REDE {bloco.rede}
              </th>
            </tr>
            <tr className="sub-header">
              <th>Edição</th>
              <th colSpan={3}>Língua Portuguesa</th>
              <th colSpan={3}>Matemática</th>
              <th>Partic.</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((row) => (
              <tr key={row.edicao} className={row.preliminar ? "row-preliminar" : undefined}>
                <td>
                  <strong>{row.edicao}</strong>
                  {row.preliminar && <span className="badge-preliminar">PRELIMINAR</span>}
                </td>
                <td>{formatar(row.lp.nota)}</td>
                <td>
                  <SetaDiff v={row.lp.diff} />
                </td>
                <td>
                  <BadgeNivel texto={row.lp.padrao} />
                </td>
                <td>{formatar(row.mt.nota)}</td>
                <td>
                  <SetaDiff v={row.mt.diff} />
                </td>
                <td>
                  <BadgeNivel texto={row.mt.padrao} />
                </td>
                <td>
                  <strong>{formatarPercentual(row.participacao.percentual)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bloco.temPreliminar && (
        <div className="nota-preliminar">
          ⚠ Os dados do SABE 2025 são <strong>preliminares</strong> e estão sujeitos a possíveis alterações.
        </div>
      )}
      {bloco.temQuebraEscala && (
        <div className="nota-preliminar">
          ⚠ A variação de 2022 para 2023 não é exibida pois, a partir de 2023, o 2° ano passou a usar a escala Saeb (média 750, dp 50). As proficiências não são comparáveis entre os dois períodos.
        </div>
      )}
    </div>
  );
}
