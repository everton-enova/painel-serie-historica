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

function encontrar(dados: LinhaSabe[], edicao: string, etapa: string, rede: string, disc: string): number | null {
  const l = dados.find(
    (d) => d.edicao === edicao && d.etapa === etapa && d.rede === rede && d.disciplina === disc
  );
  return l?.proficiencia ?? null;
}

const chartOptions = (titulo: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
    title: { display: true, text: titulo, font: { size: 13, weight: "bold" as const } },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : "-"}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      title: { display: true, text: "Proficiência" },
      ticks: { precision: 1 },
    },
  },
});

export default function BahiaArea() {
  const [sabe, setSabe] = useState<LinhaSabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [disciplina, setDisciplina] = useState("");

  // Chart 1: Por Etapa — filtro de rede
  const [redeC1, setRedeC1] = useState("");

  // Chart 2: Por Rede — filtro de edição
  const [edicaoC2, setEdicaoC2] = useState("");

  useEffect(() => {
    fetch("/api/bahia")
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) { setErro(d.erro); return; }
        setSabe(d.sabe ?? []);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const disciplinas = useMemo(() => [...new Set(sabe.map((d) => d.disciplina))].sort(), [sabe]);
  const edicoes = useMemo(() => [...new Set(sabe.map((d) => d.edicao))].sort(), [sabe]);
  const etapas = useMemo(() => [...new Set(sabe.map((d) => d.etapa))], [sabe]);
  const redes = useMemo(() => [...new Set(sabe.map((d) => d.rede))].sort(), [sabe]);

  // Sync defaults
  useEffect(() => {
    if (disciplinas.length && !disciplinas.includes(disciplina)) setDisciplina(disciplinas[0]);
  }, [disciplinas, disciplina]);

  useEffect(() => {
    if (redes.length && !redes.includes(redeC1)) setRedeC1(redes[0]);
  }, [redes, redeC1]);

  useEffect(() => {
    if (edicoes.length && !edicoes.includes(edicaoC2)) setEdicaoC2(edicoes[edicoes.length - 1]);
  }, [edicoes, edicaoC2]);

  // Chart 1: X = Etapa, datasets = Edição, filtro por rede e disciplina
  const dadosC1 = useMemo(() => ({
    labels: etapas,
    datasets: edicoes.map((ed, i) => ({
      label: ed,
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: etapas.map((etapa) => encontrar(sabe, ed, etapa, redeC1, disciplina)),
    })),
  }), [sabe, edicoes, etapas, redeC1, disciplina]);

  // Chart 2: X = Rede, datasets = Etapa, filtro por edição e disciplina
  const dadosC2 = useMemo(() => ({
    labels: redes,
    datasets: etapas.map((etapa, i) => ({
      label: etapa,
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: redes.map((rede) => encontrar(sabe, edicaoC2, etapa, rede, disciplina)),
    })),
  }), [sabe, etapas, redes, edicaoC2, disciplina]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="mt-2 fw-bold text-muted">Carregando dados SABE Bahia...</div>
      </div>
    );
  }

  if (erro) {
    return <div className="alert alert-danger m-4"><strong>Erro:</strong> {erro}</div>;
  }

  if (sabe.length === 0) {
    return (
      <div className="alert alert-warning m-4">
        Nenhum dado encontrado na aba <strong>SABE_BAHIA</strong> do Sheets.
        Verifique se a aba existe e tem dados (com cabeçalho na linha 1).
      </div>
    );
  }

  return (
    <div className="bahia-area">
      {/* Filtros globais */}
      <div className="bahia-filters no-print">
        <div className="bahia-filter-group">
          <label>Fonte</label>
          <span className="badge bg-primary fs-6 px-3">SABE</span>
          <span className="text-muted" style={{ fontSize: 11 }}>SAEB — em breve</span>
        </div>

        <div className="bahia-filter-group">
          <label>Disciplina</label>
          <div className="btn-group btn-group-sm">
            {disciplinas.map((d) => (
              <button
                key={d}
                className={`btn ${disciplina === d ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setDisciplina(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bahia-charts">
        {/* Gráfico 1: Por Etapa */}
        <div className="bahia-chart-card">
          <div className="bahia-chart-header">
            <span className="bahia-chart-title">Proficiência por Etapa</span>
            <div className="bahia-chart-filter no-print">
              <label>Rede</label>
              <select className="form-select form-select-sm" value={redeC1} onChange={(e) => setRedeC1(e.target.value)}>
                {redes.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="bahia-chart-body">
            <Bar
              data={dadosC1}
              options={chartOptions(`Proficiência ${disciplina} por Etapa — ${redeC1}`)}
            />
          </div>
        </div>

        {/* Gráfico 2: Por Rede */}
        <div className="bahia-chart-card">
          <div className="bahia-chart-header">
            <span className="bahia-chart-title">Proficiência por Rede</span>
            <div className="bahia-chart-filter no-print">
              <label>Edição</label>
              <select className="form-select form-select-sm" value={edicaoC2} onChange={(e) => setEdicaoC2(e.target.value)}>
                {edicoes.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="bahia-chart-body">
            <Bar
              data={dadosC2}
              options={chartOptions(`Proficiência ${disciplina} por Rede — ${edicaoC2}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
