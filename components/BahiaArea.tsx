"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line, Bar } from "react-chartjs-2";
import LogoUpload from "./LogoUpload";
import { formatarDataAtual } from "@/lib/formatters";

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend,
  ChartDataLabels
);

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface LinhaSabeBahia {
  edicao: string;
  estado: string;
  rede: string;
  etapa: string;
  disciplina: string;
  previstos: number | null;
  avaliados: number | null;
  participacao: number | null;
  proficiencia: number | null;
  padraoDesempenho: string;
}

interface LinhaSaebBahia {
  etapa: string;
  tipo: string;
  rede: string;
  ano: number;
  ir: number | null;
  mat: number | null;
  lp: number | null;
  mp: number | null;
  ideb: number | null;
}

// ── Paleta ────────────────────────────────────────────────────────────────────

const PALETA = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

function alpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function unique<T>(arr: T[]): T[] { return [...new Set(arr)]; }

function fmt(v: number | null, d = 1): string {
  if (v === null || v === undefined) return "–";
  return v.toFixed(d).replace(".", ",");
}

// Etapa de EM: somente ESTADUAL faz sentido
function deveOcultarRedeEtapa(etapa: string, rede: string): boolean {
  const e = etapa.toUpperCase();
  const isEM = e.includes("MÉDIO") || e.includes("MEDIO") || e.includes("3ª") || e.includes("3A");
  return isEM && rede.toUpperCase() !== "ESTADUAL";
}

// ── Opções comuns de datalabel ────────────────────────────────────────────────

const datalabelLine = {
  display: true,
  align: "top" as const,
  anchor: "end" as const,
  offset: 4,
  font: { size: 10, weight: "bold" as const },
  formatter: (v: number | null) => v != null ? v.toFixed(1).replace(".", ",") : "",
};

const datalabelBar = {
  display: true,
  anchor: "end" as const,
  align: "end" as const,
  offset: 2,
  font: { size: 10, weight: "bold" as const },
  color: "#222",
  formatter: (v: number | null) => v != null ? v.toFixed(1).replace(".", ",") : "",
};

// ── Opções de gráfico de linha ────────────────────────────────────────────────

function lineOpts(titulo: string, labelY: string, cor: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    plugins: {
      legend: { display: false },
      title: { display: true, text: titulo, font: { size: 11, weight: "bold" as const }, color: cor },
      tooltip: { callbacks: { label: (c: { parsed: { y: number | null } }) => `${c.parsed.y?.toFixed(1) ?? "–"}` } },
      datalabels: datalabelLine,
    },
    scales: {
      y: { beginAtZero: false, title: { display: true, text: labelY }, ticks: { precision: 1 } },
    },
  };
}

// ── Opções de gráfico de barras (Ideb) ───────────────────────────────────────

const barIdebOpts = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 20 } },
  plugins: {
    legend: { display: false as const },
    title: { display: true, text: "Ideb", font: { size: 11, weight: "bold" as const } },
    tooltip: { callbacks: { label: (c: { parsed: { y: number | null } }) => `Ideb: ${c.parsed.y?.toFixed(1) ?? "–"}` } },
    datalabels: datalabelBar,
  },
  scales: { y: { min: 0, max: 10, title: { display: true, text: "Ideb" }, ticks: { precision: 1 } } },
};

// ── Textos de análise ─────────────────────────────────────────────────────────

function analiseSabeBahia(etapa: string, rede: string, linhas: LinhaSabeBahia[], disciplinas: string[]): string {
  const edicoes = unique(linhas.map((d) => d.edicao)).sort();
  if (edicoes.length === 0) return "";
  const ultima = edicoes[edicoes.length - 1];
  const penultima = edicoes.length > 1 ? edicoes[edicoes.length - 2] : null;

  const partes: string[] = [];

  for (const disc of disciplinas) {
    const atual = linhas.find((d) => d.edicao === ultima && d.disciplina === disc);
    const anterior = penultima ? linhas.find((d) => d.edicao === penultima && d.disciplina === disc) : null;
    if (!atual?.proficiencia) continue;
    let texto = `Em ${disc}, a Bahia atingiu proficiência de ${fmt(atual.proficiencia)} em ${ultima}`;
    if (anterior?.proficiencia) {
      const diff = atual.proficiencia - anterior.proficiencia;
      if (diff > 0) texto += `, com crescimento de ${fmt(diff)} pontos em relação a ${penultima}`;
      else if (diff < 0) texto += `, com queda de ${fmt(Math.abs(diff))} pontos em relação a ${penultima}`;
      else texto += `, mantendo-se estável em relação a ${penultima}`;
    }
    texto += ".";
    partes.push(texto);
  }

  const part = linhas.find((d) => d.edicao === ultima)?.participacao;
  if (part != null) partes.push(`A participação na edição ${ultima} foi de ${fmt(part)}%.`);

  return `Rede ${rede} – ${etapa}: ${partes.join(" ")}`;
}

function analiseSaebBahia(etapa: string, rede: string, sorted: LinhaSaebBahia[]): string {
  if (sorted.length === 0) return "";
  const atual = sorted[sorted.length - 1];
  const anterior = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  let texto = `Rede ${rede} – ${etapa}: `;
  if (atual.ideb != null) {
    texto += `o Ideb em ${atual.ano} foi de ${fmt(atual.ideb)}`;
    if (anterior?.ideb != null) {
      const diff = atual.ideb - anterior.ideb;
      if (diff > 0) texto += `, representando crescimento de ${fmt(diff)} ponto(s) em relação a ${anterior.ano} (${fmt(anterior.ideb)})`;
      else if (diff < 0) texto += `, representando queda de ${fmt(Math.abs(diff))} ponto(s) em relação a ${anterior.ano} (${fmt(anterior.ideb)})`;
      else texto += `, mantendo-se estável em relação a ${anterior.ano}`;
    }
    texto += ".";
  } else {
    texto += `o Ideb não foi calculado em ${atual.ano}.`;
  }
  if (atual.lp != null && atual.mat != null) {
    texto += ` As proficiências foram: Língua Portuguesa ${fmt(atual.lp)} e Matemática ${fmt(atual.mat)}.`;
  }
  return texto;
}

// ── Bloco SABE ────────────────────────────────────────────────────────────────

function BlocoSabeBahia({ etapa, rede, dados }: {
  etapa: string; rede: string; dados: LinhaSabeBahia[];
}) {
  const edicoes = unique(dados.map((d) => d.edicao)).sort();
  const disciplinas = unique(dados.map((d) => d.disciplina)).sort();

  const tabelaRows = edicoes.map((ed) => {
    const rowsEd = dados.filter((d) => d.edicao === ed);
    return {
      edicao: ed,
      cols: disciplinas.map((disc) => {
        const r = rowsEd.find((d) => d.disciplina === disc);
        return { prof: r?.proficiencia ?? null, padrao: r?.padraoDesempenho ?? "–" };
      }),
      participacao: rowsEd[0]?.participacao ?? null,
    };
  });

  const textoAnalise = analiseSabeBahia(etapa, rede, dados, disciplinas);

  // Um gráfico por disciplina
  const graficos = disciplinas.map((disc, i) => {
    const cor = PALETA[i] ?? PALETA[0];
    return {
      disc,
      cor,
      data: {
        labels: edicoes,
        datasets: [{
          label: disc,
          data: edicoes.map((ed) => dados.find((d) => d.edicao === ed && d.disciplina === disc)?.proficiencia ?? null),
          borderColor: cor,
          backgroundColor: alpha(cor, 0.1),
          tension: 0.3,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: cor,
        }],
      },
    };
  });

  return (
    <div className="no-break mb-5">
      <div style={{ fontWeight: 700, color: "#002060", marginBottom: 5 }}>
        {etapa} – REDE {rede}
      </div>
      <div className="analysis-box" contentEditable suppressContentEditableWarning>
        {textoAnalise}
      </div>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th colSpan={disciplinas.length * 2 + 2}>
                RESULTADO SABE – {etapa} – REDE {rede}
              </th>
            </tr>
            <tr className="sub-header">
              <th>Edição</th>
              {disciplinas.map((disc) => (
                <>
                  <th key={disc + "_n"}>Nota – {disc}</th>
                  <th key={disc + "_p"}>Padrão</th>
                </>
              ))}
              <th>Partic. (%)</th>
            </tr>
          </thead>
          <tbody>
            {tabelaRows.map((row) => (
              <tr key={row.edicao}>
                <td><strong>{row.edicao}</strong></td>
                {row.cols.map((c, i) => (
                  <>
                    <td key={i + "_n"}>{fmt(c.prof)}</td>
                    <td key={i + "_p"}>{c.padrao}</td>
                  </>
                ))}
                <td>{fmt(row.participacao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Gráficos separados por disciplina */}
      <div className="bahia-charts-disc">
        {graficos.map(({ disc, cor, data }) => (
          <div key={disc} className="bahia-chart-inline">
            <Line
              data={data}
              options={lineOpts(`Série histórica – ${disc}`, "Proficiência", cor)}
            />
          </div>
        ))}
      </div>
      <div className="footer-mini">Fonte: Portal SABE • Elaboração: SGINF/DIE/CAV</div>
    </div>
  );
}

// ── Bloco Saeb ────────────────────────────────────────────────────────────────

function BlocoSaebBahia({ etapa, tipo, rede, dados }: {
  etapa: string; tipo: string; rede: string; dados: LinhaSaebBahia[];
}) {
  const sorted = [...dados].sort((a, b) => a.ano - b.ano);
  const anos = sorted.map((d) => String(d.ano));

  const textoAnalise = analiseSaebBahia(etapa, rede, sorted);

  const makeLineChart = (campo: "lp" | "mat", rotulo: string, cor: string) => ({
    labels: anos,
    datasets: [{
      label: rotulo,
      data: sorted.map((d) => d[campo]),
      borderColor: cor,
      backgroundColor: alpha(cor, 0.1),
      tension: 0.3,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: cor,
    }],
  });

  const idebChart = {
    labels: anos,
    datasets: [{
      label: "Ideb",
      data: sorted.map((d) => d.ideb),
      backgroundColor: sorted.map((_, i) => alpha(PALETA[0], 0.7 + i * 0.03)),
      borderColor: PALETA[0],
      borderWidth: 1,
    }],
  };

  return (
    <div className="no-break mb-5">
      <div style={{ fontWeight: 700, color: "#002060", marginBottom: 5 }}>
        {etapa}{tipo ? ` (${tipo})` : ""} – REDE {rede}
      </div>
      <div className="analysis-box" contentEditable suppressContentEditableWarning>
        {textoAnalise}
      </div>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th colSpan={6}>RESULTADO Saeb/Ideb – {etapa} – REDE {rede}</th>
            </tr>
            <tr className="sub-header">
              <th>Ano</th>
              <th>Rendimento (IR)</th>
              <th>Matemática</th>
              <th>Língua Portuguesa</th>
              <th>Média (MP)</th>
              <th>Ideb</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.ano}>
                <td><strong>{d.ano}</strong></td>
                <td>{fmt(d.ir, 2)}</td>
                <td>{fmt(d.mat)}</td>
                <td>{fmt(d.lp)}</td>
                <td>{fmt(d.mp, 2)}</td>
                <td className="highlight-cell">{fmt(d.ideb, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* LP e MAT separados + Ideb */}
      <div className="bahia-charts-saeb">
        <div className="bahia-chart-inline">
          <Line
            data={makeLineChart("lp", "Língua Portuguesa", PALETA[0])}
            options={lineOpts("Língua Portuguesa", "Proficiência", PALETA[0])}
          />
        </div>
        <div className="bahia-chart-inline">
          <Line
            data={makeLineChart("mat", "Matemática", PALETA[2])}
            options={lineOpts("Matemática", "Proficiência", PALETA[2])}
          />
        </div>
        <div className="bahia-chart-inline">
          <Bar data={idebChart} options={barIdebOpts} />
        </div>
      </div>
      <div className="footer-mini">Fonte: MEC/Inep • Elaboração: SGINF/DIE/CAV</div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function BahiaArea() {
  const [sabe, setSabe] = useState<LinhaSabeBahia[]>([]);
  const [saeb, setSaeb] = useState<LinhaSaebBahia[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarSabe, setMostrarSabe] = useState(true);
  const [redesSabe, setRedesSabe] = useState<string[]>([]);
  const [mostrarSaeb, setMostrarSaeb] = useState(true);
  const [redesSaeb, setRedesSaeb] = useState<string[]>([]);
  const [tipoSaeb, setTipoSaeb] = useState("");

  useEffect(() => {
    fetch("/api/bahia")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) { setErro(d.erro); return; }
        setSabe(d.sabe ?? []);
        setSaeb(d.saeb ?? []);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const todasRedesSabe = useMemo(() => unique(sabe.map((d) => d.rede)).sort(), [sabe]);
  const todasRedesSaeb = useMemo(() => unique(saeb.map((d) => d.rede)).sort(), [saeb]);
  const todosTiposSaeb = useMemo(() => unique(saeb.map((d) => d.tipo)).filter(Boolean).sort(), [saeb]);
  const etapasSabe = useMemo(() => unique(sabe.map((d) => d.etapa)).sort(), [sabe]);
  const etapasSaeb = useMemo(() => unique(saeb.map((d) => d.etapa)).sort(), [saeb]);

  useEffect(() => { if (todasRedesSabe.length && redesSabe.length === 0) setRedesSabe(todasRedesSabe); }, [todasRedesSabe, redesSabe.length]);
  useEffect(() => { if (todasRedesSaeb.length && redesSaeb.length === 0) setRedesSaeb(todasRedesSaeb); }, [todasRedesSaeb, redesSaeb.length]);
  useEffect(() => { if (todosTiposSaeb.length && !todosTiposSaeb.includes(tipoSaeb)) setTipoSaeb(todosTiposSaeb[0]); }, [todosTiposSaeb, tipoSaeb]);

  function toggleRede(list: string[], setList: (v: string[]) => void, rede: string) {
    setList(list.includes(rede) ? list.filter((r) => r !== rede) : [...list, rede]);
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="mt-2 fw-bold text-muted">Carregando dados da Bahia...</div>
      </div>
    );
  }

  if (erro) {
    return <div className="alert alert-danger m-4"><strong>Erro:</strong> {erro}</div>;
  }

  return (
    <>
      {/* Filtros */}
      <div className="bahia-filtros-bar no-print">
        <div className="bahia-filtro-grupo">
          <label className="bahia-filtro-label">
            <input type="checkbox" checked={mostrarSabe} onChange={(e) => setMostrarSabe(e.target.checked)} />
            {" "}SABE
          </label>
          {mostrarSabe && todasRedesSabe.map((r) => (
            <label key={r} className="bahia-filtro-rede">
              <input type="checkbox" checked={redesSabe.includes(r)} onChange={() => toggleRede(redesSabe, setRedesSabe, r)} />
              {" "}{r}
            </label>
          ))}
        </div>
        <div className="bahia-filtro-sep" />
        <div className="bahia-filtro-grupo">
          <label className="bahia-filtro-label">
            <input type="checkbox" checked={mostrarSaeb} onChange={(e) => setMostrarSaeb(e.target.checked)} />
            {" "}Saeb/Ideb
          </label>
          {mostrarSaeb && todasRedesSaeb.map((r) => (
            <label key={r} className="bahia-filtro-rede">
              <input type="checkbox" checked={redesSaeb.includes(r)} onChange={() => toggleRede(redesSaeb, setRedesSaeb, r)} />
              {" "}{r}
            </label>
          ))}
          {mostrarSaeb && todosTiposSaeb.length > 1 && (
            <select className="form-select form-select-sm" style={{ width: "auto" }} value={tipoSaeb} onChange={(e) => setTipoSaeb(e.target.value)}>
              {todosTiposSaeb.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Nota Técnica */}
      <div className="nota-tecnica" id="conteudoNotaBahia">
        <header className="header-modern">
          <LogoUpload />
          <div className="header-info">
            <h1 className="header-title">BAHIA – SÉRIE HISTÓRICA</h1>
            <div className="header-meta">
              <div><strong>SETOR:</strong> SGINF/DIE/COORDENAÇÃO DE AVALIAÇÃO</div>
              <div><strong>DATA:</strong> {formatarDataAtual()}</div>
            </div>
          </div>
        </header>

        {mostrarSabe && sabe.length > 0 && (
          <div id="secaoBahiaSabe">
            <div className="section-title">1. DADOS DA SÉRIE HISTÓRICA DO SABE – BAHIA</div>
            {etapasSabe.map((etapa) =>
              redesSabe.map((rede) => {
                const linhas = sabe.filter((d) => d.etapa === etapa && d.rede === rede);
                if (linhas.length === 0) return null;
                return <BlocoSabeBahia key={`${etapa}_${rede}`} etapa={etapa} rede={rede} dados={linhas} />;
              })
            )}
          </div>
        )}

        {mostrarSaeb && saeb.length > 0 && (
          <div id="secaoBahiaSaeb" style={{ marginTop: 30 }}>
            <div className="section-title">2. RESULTADO DO Ideb/Saeb – BAHIA</div>
            {etapasSaeb.map((etapa) =>
              redesSaeb.map((rede) => {
                // EM 3ª série: somente ESTADUAL
                if (deveOcultarRedeEtapa(etapa, rede)) return null;
                const linhas = saeb.filter(
                  (d) => d.etapa === etapa && d.rede === rede && (!tipoSaeb || d.tipo === tipoSaeb)
                );
                if (linhas.length === 0) return null;
                const temDados = linhas.some((d) => d.lp !== null || d.mat !== null || d.ideb !== null);
                if (!temDados) return null;
                return (
                  <BlocoSaebBahia
                    key={`${etapa}_${rede}_${tipoSaeb}`}
                    etapa={etapa}
                    tipo={tipoSaeb}
                    rede={rede}
                    dados={linhas}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
