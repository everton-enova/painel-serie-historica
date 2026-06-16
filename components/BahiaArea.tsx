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
import { Line, Bar } from "react-chartjs-2";
import LogoUpload from "./LogoUpload";
import { formatarDataAtual } from "@/lib/formatters";

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend
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

// ── Bloco SABE ────────────────────────────────────────────────────────────────

function BlocoSabeBahia({
  etapa, rede, dados,
}: {
  etapa: string; rede: string; dados: LinhaSabeBahia[];
}) {
  const edicoes = unique(dados.map((d) => d.edicao)).sort();
  const disciplinas = unique(dados.map((d) => d.disciplina)).sort();

  // Tabela: uma linha por edição, colunas por disciplina
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

  // Gráfico de linha: série histórica por disciplina
  const chartData = {
    labels: edicoes,
    datasets: disciplinas.map((disc, i) => ({
      label: disc,
      data: edicoes.map(
        (ed) => dados.find((d) => d.edicao === ed && d.disciplina === disc)?.proficiencia ?? null
      ),
      borderColor: PALETA[i],
      backgroundColor: alpha(PALETA[i], 0.12),
      tension: 0.3,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    })),
  };

  return (
    <div className="no-break mb-5">
      <div style={{ fontWeight: 700, color: "#002060", marginBottom: 5 }}>
        {etapa} – REDE {rede}
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
      <div className="bahia-chart-inline">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
              title: { display: true, text: `Proficiência – Série Histórica – ${rede}`, font: { size: 11 } },
              tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y?.toFixed(1) ?? "–"}` } },
            },
            scales: {
              y: { beginAtZero: false, title: { display: true, text: "Proficiência" }, ticks: { precision: 1 } },
            },
          }}
        />
      </div>
      <div className="footer-mini">Fonte: Portal SABE • Elaboração: SGINF/DIE/CAV</div>
    </div>
  );
}

// ── Bloco SAEB ────────────────────────────────────────────────────────────────

function BlocoSaebBahia({
  etapa, tipo, rede, dados,
}: {
  etapa: string; tipo: string; rede: string; dados: LinhaSaebBahia[];
}) {
  const sorted = [...dados].sort((a, b) => a.ano - b.ano);
  const anos = sorted.map((d) => String(d.ano));

  const profChart = {
    labels: anos,
    datasets: [
      {
        label: "Língua Portuguesa",
        data: sorted.map((d) => d.lp),
        borderColor: PALETA[0],
        backgroundColor: alpha(PALETA[0], 0.12),
        tension: 0.3, fill: true, pointRadius: 5, pointHoverRadius: 7,
      },
      {
        label: "Matemática",
        data: sorted.map((d) => d.mat),
        borderColor: PALETA[2],
        backgroundColor: alpha(PALETA[2], 0.12),
        tension: 0.3, fill: true, pointRadius: 5, pointHoverRadius: 7,
      },
    ],
  };

  const idebChart = {
    labels: anos,
    datasets: [{
      label: "IDEB",
      data: sorted.map((d) => d.ideb),
      backgroundColor: alpha(PALETA[0], 0.75),
      borderColor: PALETA[0],
      borderWidth: 1,
    }],
  };

  const lineOpts = (titulo: string, labelY: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: titulo, font: { size: 11 } },
      tooltip: { callbacks: { label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) => `${c.dataset.label}: ${c.parsed.y?.toFixed(2) ?? "–"}` } },
    },
    scales: { y: { beginAtZero: false, title: { display: true, text: labelY }, ticks: { precision: 2 } } },
  });

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false as const },
      title: { display: true, text: "IDEB", font: { size: 11 } },
      tooltip: { callbacks: { label: (c: { dataset: { label?: string }; parsed: { y: number | null } }) => `IDEB: ${c.parsed.y?.toFixed(1) ?? "–"}` } },
    },
    scales: { y: { min: 0, max: 10, title: { display: true, text: "IDEB" }, ticks: { precision: 1 } } },
  };

  return (
    <div className="no-break mb-5">
      <div style={{ fontWeight: 700, color: "#002060", marginBottom: 5 }}>
        {etapa}{tipo ? ` (${tipo})` : ""} – REDE {rede}
      </div>
      <div className="table-responsive">
        <table className="modern-table">
          <thead>
            <tr>
              <th colSpan={6}>RESULTADO Saeb/IDEB – {etapa} – REDE {rede}</th>
            </tr>
            <tr className="sub-header">
              <th>Ano</th>
              <th>Rendimento (IR)</th>
              <th>Matemática</th>
              <th>Língua Portuguesa</th>
              <th>Média (MP)</th>
              <th>IDEB</th>
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
      <div className="bahia-charts-inline">
        <div className="bahia-chart-inline bahia-chart-wide">
          <Line data={profChart} options={lineOpts("Proficiência LP e Matemática – Série Histórica", "Proficiência")} />
        </div>
        <div className="bahia-chart-inline bahia-chart-narrow">
          <Bar data={idebChart} options={barOpts} />
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

  // Filtros SABE
  const [mostrarSabe, setMostrarSabe] = useState(true);
  const [redesSabe, setRedesSabe] = useState<string[]>([]);

  // Filtros SAEB
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

  // Listas derivadas
  const todasRedesSabe = useMemo(() => unique(sabe.map((d) => d.rede)).sort(), [sabe]);
  const todasRedesSaeb = useMemo(() => unique(saeb.map((d) => d.rede)).sort(), [saeb]);
  const todosTiposSaeb = useMemo(() => unique(saeb.map((d) => d.tipo)).filter(Boolean).sort(), [saeb]);
  const etapasSabe = useMemo(() => unique(sabe.map((d) => d.etapa)).sort(), [sabe]);
  const etapasSaeb = useMemo(() => unique(saeb.map((d) => d.etapa)).sort(), [saeb]);

  // Inicializa filtros de rede e tipo quando os dados chegam
  useEffect(() => {
    if (todasRedesSabe.length && redesSabe.length === 0) setRedesSabe(todasRedesSabe);
  }, [todasRedesSabe, redesSabe.length]);

  useEffect(() => {
    if (todasRedesSaeb.length && redesSaeb.length === 0) setRedesSaeb(todasRedesSaeb);
  }, [todasRedesSaeb, redesSaeb.length]);

  useEffect(() => {
    if (todosTiposSaeb.length && !todosTiposSaeb.includes(tipoSaeb)) setTipoSaeb(todosTiposSaeb[0]);
  }, [todosTiposSaeb, tipoSaeb]);

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
      {/* ── Filtros (não imprime) ── */}
      <div className="bahia-filtros-bar no-print">
        <div className="bahia-filtro-grupo">
          <label className="bahia-filtro-label">
            <input type="checkbox" checked={mostrarSabe} onChange={(e) => setMostrarSabe(e.target.checked)} />
            {" "}SABE
          </label>
          {mostrarSabe && todasRedesSabe.map((r) => (
            <label key={r} className="bahia-filtro-rede">
              <input
                type="checkbox"
                checked={redesSabe.includes(r)}
                onChange={() => toggleRede(redesSabe, setRedesSabe, r)}
              />
              {" "}{r}
            </label>
          ))}
        </div>

        <div className="bahia-filtro-sep" />

        <div className="bahia-filtro-grupo">
          <label className="bahia-filtro-label">
            <input type="checkbox" checked={mostrarSaeb} onChange={(e) => setMostrarSaeb(e.target.checked)} />
            {" "}Saeb/IDEB
          </label>
          {mostrarSaeb && todasRedesSaeb.map((r) => (
            <label key={r} className="bahia-filtro-rede">
              <input
                type="checkbox"
                checked={redesSaeb.includes(r)}
                onChange={() => toggleRede(redesSaeb, setRedesSaeb, r)}
              />
              {" "}{r}
            </label>
          ))}
          {mostrarSaeb && todosTiposSaeb.length > 1 && (
            <select
              className="form-select form-select-sm"
              style={{ width: "auto" }}
              value={tipoSaeb}
              onChange={(e) => setTipoSaeb(e.target.value)}
            >
              {todosTiposSaeb.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Nota Técnica ── */}
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

        {/* SABE */}
        {mostrarSabe && sabe.length > 0 && (
          <div id="secaoBahiaSabe">
            <div className="section-title">1. DADOS DA SÉRIE HISTÓRICA DO SABE – BAHIA</div>
            {etapasSabe.map((etapa) =>
              redesSabe.map((rede) => {
                const linhas = sabe.filter((d) => d.etapa === etapa && d.rede === rede);
                if (linhas.length === 0) return null;
                return (
                  <BlocoSabeBahia
                    key={`${etapa}_${rede}`}
                    etapa={etapa}
                    rede={rede}
                    dados={linhas}
                  />
                );
              })
            )}
            {mostrarSabe && sabe.length === 0 && (
              <p className="text-muted">Sem dados SABE_BAHIA na planilha.</p>
            )}
          </div>
        )}

        {/* SAEB */}
        {mostrarSaeb && saeb.length > 0 && (
          <div id="secaoBahiaSaeb" style={{ marginTop: 30 }}>
            <div className="section-title">2. RESULTADO DO IDEB/Saeb – BAHIA</div>
            {etapasSaeb.map((etapa) =>
              redesSaeb.map((rede) => {
                const linhas = saeb.filter(
                  (d) => d.etapa === etapa && d.rede === rede && (!tipoSaeb || d.tipo === tipoSaeb)
                );
                // Oculta combinações sem nenhum dado real (ex: EM 3ª série + Municipal)
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
            {mostrarSaeb && saeb.length === 0 && (
              <p className="text-muted">Sem dados Saeb_BAHIA na planilha.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
