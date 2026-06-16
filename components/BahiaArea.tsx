"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ── Tipos ────────────────────────────────────────────────────────────────────

interface LinhaSabe {
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

interface LinhaSaeb {
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

type MetricaSaeb = "lp" | "mat" | "mp" | "ideb" | "ir";

const LABEL_METRICA: Record<MetricaSaeb, string> = {
  lp: "Língua Portuguesa",
  mat: "Matemática",
  mp: "Média Ponderada",
  ideb: "IDEB",
  ir: "Indicador de Rendimento",
};

// ── Cores ────────────────────────────────────────────────────────────────────

const CORES = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#65a30d",
];

function cor(i: number, alpha = 1) {
  const hex = CORES[i % CORES.length];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : hex;
}

// ── Opções de gráfico ────────────────────────────────────────────────────────

function chartOpts(titulo: string, labelY: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: titulo, font: { size: 13, weight: "bold" as const } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : "–"}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: { display: true, text: labelY },
        ticks: { precision: 2 },
      },
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function unique<T>(arr: T[]): T[] { return [...new Set(arr)]; }

// ── Componente principal ─────────────────────────────────────────────────────

export default function BahiaArea() {
  const [sabe, setSabe] = useState<LinhaSabe[]>([]);
  const [saeb, setSaeb] = useState<LinhaSaeb[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [fonte, setFonte] = useState<"SABE" | "SAEB">("SAEB");

  // SABE filters
  const [sabeDisc, setSabeDisc] = useState("");
  const [sabeRedeC1, setSabeRedeC1] = useState("");
  const [sabeEdicaoC2, setSabeEdicaoC2] = useState("");

  // SAEB filters
  const [saebMetrica, setSaebMetrica] = useState<MetricaSaeb>("ideb");
  const [saebTipo, setSaebTipo] = useState("");
  const [saebRedeC1, setSaebRedeC1] = useState("");
  const [saebAnoC2, setSaebAnoC2] = useState<number>(0);

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

  // ── SABE derived ─────────────────────────────────────────────────────────

  const sabeDiscs = useMemo(() => unique(sabe.map((d) => d.disciplina)).sort(), [sabe]);
  const sabeEdicoes = useMemo(() => unique(sabe.map((d) => d.edicao)).sort(), [sabe]);
  const sabeEtapas = useMemo(() => unique(sabe.map((d) => d.etapa)), [sabe]);
  const sabeRedes = useMemo(() => unique(sabe.map((d) => d.rede)).sort(), [sabe]);

  useEffect(() => { if (sabeDiscs.length && !sabeDiscs.includes(sabeDisc)) setSabeDisc(sabeDiscs[0]); }, [sabeDiscs, sabeDisc]);
  useEffect(() => { if (sabeRedes.length && !sabeRedes.includes(sabeRedeC1)) setSabeRedeC1(sabeRedes[0]); }, [sabeRedes, sabeRedeC1]);
  useEffect(() => { if (sabeEdicoes.length && !sabeEdicoes.includes(sabeEdicaoC2)) setSabeEdicaoC2(sabeEdicoes[sabeEdicoes.length - 1]); }, [sabeEdicoes, sabeEdicaoC2]);

  // Gráfico SABE 1: X=Etapa, groups=Edição, filtro por rede+disciplina
  const sabeC1 = useMemo(() => ({
    labels: sabeEtapas,
    datasets: sabeEdicoes.map((ed, i) => ({
      label: ed,
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: sabeEtapas.map((etapa) =>
        sabe.find((d) => d.edicao === ed && d.etapa === etapa && d.rede === sabeRedeC1 && d.disciplina === sabeDisc)?.proficiencia ?? null
      ),
    })),
  }), [sabe, sabeEdicoes, sabeEtapas, sabeRedeC1, sabeDisc]);

  // Gráfico SABE 2: X=Rede, groups=Etapa, filtro por edição+disciplina
  const sabeC2 = useMemo(() => ({
    labels: sabeRedes,
    datasets: sabeEtapas.map((etapa, i) => ({
      label: etapa,
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: sabeRedes.map((rede) =>
        sabe.find((d) => d.edicao === sabeEdicaoC2 && d.etapa === etapa && d.rede === rede && d.disciplina === sabeDisc)?.proficiencia ?? null
      ),
    })),
  }), [sabe, sabeEtapas, sabeRedes, sabeEdicaoC2, sabeDisc]);

  // ── SAEB derived ──────────────────────────────────────────────────────────

  const saebTipos = useMemo(() => unique(saeb.map((d) => d.tipo)).sort(), [saeb]);
  const saebAnos = useMemo(() => unique(saeb.map((d) => d.ano)).sort((a, b) => a - b), [saeb]);
  const saebEtapas = useMemo(() => unique(saeb.map((d) => d.etapa)), [saeb]);
  const saebRedes = useMemo(() => unique(saeb.map((d) => d.rede)).sort(), [saeb]);

  useEffect(() => { if (saebTipos.length && !saebTipos.includes(saebTipo)) setSaebTipo(saebTipos[0]); }, [saebTipos, saebTipo]);
  useEffect(() => { if (saebRedes.length && !saebRedes.includes(saebRedeC1)) setSaebRedeC1(saebRedes[0]); }, [saebRedes, saebRedeC1]);
  useEffect(() => { if (saebAnos.length && !saebAnos.includes(saebAnoC2)) setSaebAnoC2(saebAnos[saebAnos.length - 1]); }, [saebAnos, saebAnoC2]);

  // Gráfico SAEB 1: X=Etapa, groups=Ano, filtro por rede+tipo+métrica
  const saebC1 = useMemo(() => ({
    labels: saebEtapas,
    datasets: saebAnos.map((ano, i) => ({
      label: String(ano),
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: saebEtapas.map((etapa) => {
        const l = saeb.find((d) => d.ano === ano && d.etapa === etapa && d.rede === saebRedeC1 && d.tipo === saebTipo);
        return l ? (l[saebMetrica] ?? null) : null;
      }),
    })),
  }), [saeb, saebAnos, saebEtapas, saebRedeC1, saebTipo, saebMetrica]);

  // Gráfico SAEB 2: X=Rede, groups=Etapa, filtro por ano+tipo+métrica
  const saebC2 = useMemo(() => ({
    labels: saebRedes,
    datasets: saebEtapas.map((etapa, i) => ({
      label: etapa,
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: saebRedes.map((rede) => {
        const l = saeb.find((d) => d.ano === saebAnoC2 && d.etapa === etapa && d.rede === rede && d.tipo === saebTipo);
        return l ? (l[saebMetrica] ?? null) : null;
      }),
    })),
  }), [saeb, saebEtapas, saebRedes, saebAnoC2, saebTipo, saebMetrica]);

  // ── Render ────────────────────────────────────────────────────────────────

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

  const semDados = fonte === "SABE" ? sabe.length === 0 : saeb.length === 0;
  if (semDados) {
    return (
      <div className="alert alert-warning m-4">
        Nenhum dado encontrado na aba <strong>{fonte === "SABE" ? "SABE_BAHIA" : "Saeb_BAHIA"}</strong>.
        Verifique se a aba existe no Sheets com cabeçalho na linha 1.
      </div>
    );
  }

  return (
    <div className="bahia-area">
      {/* Filtros globais */}
      <div className="bahia-filters no-print">
        <div className="bahia-filter-group">
          <label>Fonte</label>
          <div className="btn-group btn-group-sm">
            {(["SAEB", "SABE"] as const).map((f) => (
              <button key={f} className={`btn ${fonte === f ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFonte(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {fonte === "SABE" && (
          <div className="bahia-filter-group">
            <label>Disciplina</label>
            <div className="btn-group btn-group-sm">
              {sabeDiscs.map((d) => (
                <button key={d} className={`btn ${sabeDisc === d ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setSabeDisc(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {fonte === "SAEB" && (
          <>
            <div className="bahia-filter-group">
              <label>Métrica</label>
              <div className="btn-group btn-group-sm">
                {(["lp", "mat", "mp", "ideb", "ir"] as MetricaSaeb[]).map((m) => (
                  <button key={m} className={`btn ${saebMetrica === m ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setSaebMetrica(m)}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {saebTipos.length > 1 && (
              <div className="bahia-filter-group">
                <label>Tipo</label>
                <select className="form-select form-select-sm" value={saebTipo} onChange={(e) => setSaebTipo(e.target.value)}>
                  {saebTipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Gráficos SABE ── */}
      {fonte === "SABE" && (
        <div className="bahia-charts">
          <div className="bahia-chart-card">
            <div className="bahia-chart-header">
              <span className="bahia-chart-title">Proficiência por Etapa</span>
              <div className="bahia-chart-filter no-print">
                <label>Rede</label>
                <select className="form-select form-select-sm" value={sabeRedeC1} onChange={(e) => setSabeRedeC1(e.target.value)}>
                  {sabeRedes.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="bahia-chart-body">
              <Bar data={sabeC1} options={chartOpts(`${sabeDisc} por Etapa — ${sabeRedeC1}`, "Proficiência")} />
            </div>
          </div>

          <div className="bahia-chart-card">
            <div className="bahia-chart-header">
              <span className="bahia-chart-title">Proficiência por Rede</span>
              <div className="bahia-chart-filter no-print">
                <label>Edição</label>
                <select className="form-select form-select-sm" value={sabeEdicaoC2} onChange={(e) => setSabeEdicaoC2(e.target.value)}>
                  {sabeEdicoes.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="bahia-chart-body">
              <Bar data={sabeC2} options={chartOpts(`${sabeDisc} por Rede — ${sabeEdicaoC2}`, "Proficiência")} />
            </div>
          </div>
        </div>
      )}

      {/* ── Gráficos SAEB ── */}
      {fonte === "SAEB" && (
        <div className="bahia-charts">
          <div className="bahia-chart-card">
            <div className="bahia-chart-header">
              <span className="bahia-chart-title">{LABEL_METRICA[saebMetrica]} por Etapa</span>
              <div className="bahia-chart-filter no-print">
                <label>Rede</label>
                <select className="form-select form-select-sm" value={saebRedeC1} onChange={(e) => setSaebRedeC1(e.target.value)}>
                  {saebRedes.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="bahia-chart-body">
              <Bar data={saebC1} options={chartOpts(`${LABEL_METRICA[saebMetrica]} por Etapa — ${saebRedeC1}`, LABEL_METRICA[saebMetrica])} />
            </div>
          </div>

          <div className="bahia-chart-card">
            <div className="bahia-chart-header">
              <span className="bahia-chart-title">{LABEL_METRICA[saebMetrica]} por Rede</span>
              <div className="bahia-chart-filter no-print">
                <label>Ano</label>
                <select className="form-select form-select-sm" value={saebAnoC2} onChange={(e) => setSaebAnoC2(Number(e.target.value))}>
                  {saebAnos.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="bahia-chart-body">
              <Bar data={saebC2} options={chartOpts(`${LABEL_METRICA[saebMetrica]} por Rede — ${saebAnoC2}`, LABEL_METRICA[saebMetrica])} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
