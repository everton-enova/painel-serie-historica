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

interface LinhaBahia {
  fonte: string;
  ano: number;
  etapa: string;
  rede: string;
  lp: number | null;
  mt: number | null;
  ideb: number | null;
}

type Componente = "LP" | "MT" | "IDEB";

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

function getValor(linha: LinhaBahia, comp: Componente): number | null {
  if (comp === "LP") return linha.lp;
  if (comp === "MT") return linha.mt;
  return linha.ideb;
}

function encontrar(dados: LinhaBahia[], fonte: string, comp: Componente, ano: number, etapa: string, rede: string): number | null {
  const linha = dados.find(
    (d) => d.fonte === fonte && d.ano === ano && d.etapa === etapa && d.rede === rede
  );
  return linha ? getValor(linha, comp) : null;
}

const CHART_OPTIONS = (titulo: string, labelY: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
    title: { display: true, text: titulo, font: { size: 14, weight: "bold" as const } },
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
      title: { display: true, text: labelY },
      ticks: { precision: 1 },
    },
  },
});

export default function BahiaArea() {
  const [dados, setDados] = useState<LinhaBahia[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [fonte, setFonte] = useState<"SABE" | "SAEB">("SAEB");
  const [componente, setComponente] = useState<Componente>("LP");

  // Chart 1 filter: rede
  const [redeC1, setRedeC1] = useState("");

  // Chart 2 filter: ano
  const [anoC2, setAnoC2] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/bahia")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setDados(d);
        } else {
          setErro(d.erro || "Erro ao carregar dados.");
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Derived lists from current fonte
  const dadosFonte = useMemo(() => dados.filter((d) => d.fonte === fonte), [dados, fonte]);

  const anos = useMemo(
    () => [...new Set(dadosFonte.map((d) => d.ano))].sort((a, b) => a - b),
    [dadosFonte]
  );
  const etapas = useMemo(
    () => [...new Set(dadosFonte.map((d) => d.etapa))],
    [dadosFonte]
  );
  const redes = useMemo(
    () => [...new Set(dadosFonte.map((d) => d.rede))],
    [dadosFonte]
  );

  // Sync defaults when fonte or data changes
  useEffect(() => {
    if (redes.length && !redes.includes(redeC1)) setRedeC1(redes[0]);
  }, [redes, redeC1]);

  useEffect(() => {
    if (anos.length && (anoC2 === null || !anos.includes(anoC2))) setAnoC2(anos[anos.length - 1]);
  }, [anos, anoC2]);

  // IDEB only available for SAEB
  useEffect(() => {
    if (fonte === "SABE" && componente === "IDEB") setComponente("LP");
  }, [fonte, componente]);

  const labelComp = componente === "LP" ? "Proficiência LP" : componente === "MT" ? "Proficiência MT" : "IDEB";

  // ── Chart 1: Etapas × Anos ────────────────────────────────────────────
  const chartEtapas = useMemo(() => {
    const datasets = anos.map((ano, i) => ({
      label: String(ano),
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: etapas.map((etapa) => encontrar(dados, fonte, componente, ano, etapa, redeC1)),
    }));
    return { labels: etapas, datasets };
  }, [dados, fonte, componente, anos, etapas, redeC1]);

  // ── Chart 2: Redes × Etapas ───────────────────────────────────────────
  const chartRedes = useMemo(() => {
    if (anoC2 === null) return { labels: [], datasets: [] };
    const datasets = etapas.map((etapa, i) => ({
      label: etapa,
      backgroundColor: cor(i, 0.8),
      borderColor: cor(i),
      borderWidth: 1,
      data: redes.map((rede) => encontrar(dados, fonte, componente, anoC2, etapa, rede)),
    }));
    return { labels: redes, datasets };
  }, [dados, fonte, componente, etapas, redes, anoC2]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="mt-2 fw-bold text-muted">Carregando dados da Bahia...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="alert alert-danger m-4">
        <strong>Erro ao carregar dados:</strong> {erro}
      </div>
    );
  }

  if (dadosFonte.length === 0) {
    return (
      <div className="alert alert-warning m-4">
        Nenhum dado encontrado para <strong>{fonte}</strong> na aba &quot;Bahia&quot; do Sheets.
        Verifique se a aba foi criada e tem dados.
      </div>
    );
  }

  return (
    <div className="bahia-area">
      {/* ── Filtros globais ── */}
      <div className="bahia-filters no-print">
        <div className="bahia-filter-group">
          <label>Fonte</label>
          <div className="btn-group btn-group-sm">
            {(["SAEB", "SABE"] as const).map((f) => (
              <button
                key={f}
                className={`btn ${fonte === f ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setFonte(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bahia-filter-group">
          <label>Componente</label>
          <div className="btn-group btn-group-sm">
            {(["LP", "MT"] as const).map((c) => (
              <button
                key={c}
                className={`btn ${componente === c ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setComponente(c)}
              >
                {c === "LP" ? "Língua Portuguesa" : "Matemática"}
              </button>
            ))}
            {fonte === "SAEB" && (
              <button
                className={`btn ${componente === "IDEB" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setComponente("IDEB")}
              >
                IDEB
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bahia-charts">
        {/* ── Gráfico 1: Por Etapa ── */}
        <div className="bahia-chart-card">
          <div className="bahia-chart-header">
            <span className="bahia-chart-title">Comparativo por Etapa</span>
            <div className="bahia-chart-filter no-print">
              <label>Rede</label>
              <select
                className="form-select form-select-sm"
                value={redeC1}
                onChange={(e) => setRedeC1(e.target.value)}
              >
                {redes.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bahia-chart-body">
            {etapas.length > 0 ? (
              <Bar
                data={chartEtapas}
                options={CHART_OPTIONS(
                  `${labelComp} por Etapa — Rede ${redeC1}`,
                  labelComp
                )}
              />
            ) : (
              <p className="text-muted text-center">Sem etapas para exibir.</p>
            )}
          </div>
        </div>

        {/* ── Gráfico 2: Por Rede ── */}
        <div className="bahia-chart-card">
          <div className="bahia-chart-header">
            <span className="bahia-chart-title">Comparativo por Rede</span>
            <div className="bahia-chart-filter no-print">
              <label>Ano</label>
              <select
                className="form-select form-select-sm"
                value={anoC2 ?? ""}
                onChange={(e) => setAnoC2(Number(e.target.value))}
              >
                {anos.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bahia-chart-body">
            {redes.length > 0 ? (
              <Bar
                data={chartRedes}
                options={CHART_OPTIONS(
                  `${labelComp} por Rede — ${anoC2}`,
                  labelComp
                )}
              />
            ) : (
              <p className="text-muted text-center">Sem redes para exibir.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
