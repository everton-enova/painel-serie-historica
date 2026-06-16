"use client";

import { useMemo, useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import PopupManager from "@/components/PopupManager";
import TopBar from "@/components/TopBar";
import RelatorioArea from "@/components/RelatorioArea";
import DocumentoArea from "@/components/DocumentoArea";
import BahiaArea from "@/components/BahiaArea";
import { useSession } from "@/hooks/useSession";
import { popupAlerta } from "@/lib/popup";
import { correspondeRede } from "@/lib/normalize";
import { formatarDataAtual } from "@/lib/formatters";
import type { BlocoSabe, BlocoSaeb, InfoEntidade, RespostaBusca } from "@/lib/types";

export type Modo = "escola" | "municipio" | "documento" | "bahia";

export default function Home() {
  const { usuarioLogado, verificando, entrando, erro, login, sair } = useSession();

  const [modoAtual, setModoAtual] = useState<Modo>("escola");
  const [searchInput, setSearchInput] = useState("");
  const [numNota, setNumNota] = useState("");
  const [numDoc, setNumDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatorioVisivel, setRelatorioVisivel] = useState(false);

  const [info, setInfo] = useState<InfoEntidade | null>(null);
  const [tipo, setTipo] = useState<"escola" | "municipio">("escola");
  const [dadosSabeAtual, setDadosSabeAtual] = useState<BlocoSabe[]>([]);
  const [dadosSaebAtual, setDadosSaebAtual] = useState<Omit<BlocoSaeb, "raw">[]>([]);

  const [checkSabe, setCheckSabe] = useState(true);
  const [checkSaeb, setCheckSaeb] = useState(true);
  const [checkSabeRedeMunicipal, setCheckSabeRedeMunicipal] = useState(true);
  const [checkSabeRedeEstadual, setCheckSabeRedeEstadual] = useState(true);
  const [checkSaebRedePublica, setCheckSaebRedePublica] = useState(true);
  const [checkSaebRedeMunicipal, setCheckSaebRedeMunicipal] = useState(true);
  const [checkSaebRedeEstadual, setCheckSaebRedeEstadual] = useState(true);

  const redesSabeAtivas = useMemo(() => {
    const redes: string[] = [];
    if (checkSabeRedeMunicipal) redes.push("MUNICIPAL");
    if (checkSabeRedeEstadual) redes.push("ESTADUAL");
    return redes;
  }, [checkSabeRedeMunicipal, checkSabeRedeEstadual]);

  const redesSaebAtivas = useMemo(() => {
    const redes: string[] = [];
    if (checkSaebRedePublica) redes.push("PÚBLICA", "PUBLICA");
    if (checkSaebRedeMunicipal) redes.push("MUNICIPAL");
    if (checkSaebRedeEstadual) redes.push("ESTADUAL");
    return redes;
  }, [checkSaebRedePublica, checkSaebRedeMunicipal, checkSaebRedeEstadual]);

  const dadosSabeFiltrados = useMemo(() => {
    if (modoAtual === "municipio") {
      return dadosSabeAtual.filter((bloco) => correspondeRede(bloco.rede, redesSabeAtivas));
    }
    return dadosSabeAtual;
  }, [dadosSabeAtual, modoAtual, redesSabeAtivas]);

  const dadosSaebFiltrados = useMemo(() => {
    if (modoAtual === "municipio") {
      return dadosSaebAtual.filter((bloco) => correspondeRede(bloco.rede, redesSaebAtivas));
    }
    return dadosSaebAtual;
  }, [dadosSaebAtual, modoAtual, redesSaebAtivas]);

  function trocarModo(modo: Modo) {
    setModoAtual(modo);
    if (modo !== "documento" && modo !== "bahia") {
      setSearchInput("");
      setDadosSabeAtual([]);
      setDadosSaebAtual([]);
      setRelatorioVisivel(false);
    }
  }

  async function buscar() {
    const codigo = searchInput.trim();
    if (!codigo) return;

    setLoading(true);
    setRelatorioVisivel(false);

    try {
      const url =
        modoAtual === "escola"
          ? `/api/escola?coInep=${encodeURIComponent(codigo)}`
          : `/api/municipio?cd=${encodeURIComponent(codigo)}`;
      const res = await fetch(url);
      const dados: RespostaBusca = await res.json();

      setLoading(false);

      if ("erro" in dados) {
        popupAlerta("Não encontrado", dados.erro, "warning");
        return;
      }

      setInfo(dados.info);
      setTipo(dados.tipo);
      setDadosSabeAtual(dados.historico || []);
      setDadosSaebAtual(dados.saeb || []);
      setRelatorioVisivel(true);
    } catch (err) {
      setLoading(false);
      popupAlerta(
        "Erro na busca",
        `Não foi possível buscar os dados. Verifique sua conexão e tente novamente.<br><br><small style="color:#999">${
          err instanceof Error ? err.message : String(err)
        }</small>`,
        "error"
      );
    }
  }

  if (verificando) {
    return null;
  }

  if (!usuarioLogado) {
    return (
      <>
        <LoginScreen entrando={entrando} erro={erro} onLogin={login} />
        <PopupManager />
      </>
    );
  }

  return (
    <div id="mainScreen">
      <TopBar
        modoAtual={modoAtual}
        onTrocarModo={trocarModo}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onBuscar={buscar}
        numNota={numNota}
        onNumNotaChange={setNumNota}
        numDoc={numDoc}
        onNumDocChange={setNumDoc}
        checkSabe={checkSabe}
        onCheckSabeChange={setCheckSabe}
        checkSaeb={checkSaeb}
        onCheckSaebChange={setCheckSaeb}
        checkSabeRedeMunicipal={checkSabeRedeMunicipal}
        onCheckSabeRedeMunicipalChange={setCheckSabeRedeMunicipal}
        checkSabeRedeEstadual={checkSabeRedeEstadual}
        onCheckSabeRedeEstadualChange={setCheckSabeRedeEstadual}
        checkSaebRedePublica={checkSaebRedePublica}
        onCheckSaebRedePublicaChange={setCheckSaebRedePublica}
        checkSaebRedeMunicipal={checkSaebRedeMunicipal}
        onCheckSaebRedeMunicipalChange={setCheckSaebRedeMunicipal}
        checkSaebRedeEstadual={checkSaebRedeEstadual}
        onCheckSaebRedeEstadualChange={setCheckSaebRedeEstadual}
        usuarioLogado={usuarioLogado}
        onImprimir={() => window.print()}
        onSair={sair}
      />

      {loading && (
        <div id="loading" className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="mt-2 fw-bold text-muted">Carregando dados...</div>
        </div>
      )}

      {modoAtual !== "documento" && relatorioVisivel && info && (
        <RelatorioArea
          info={info}
          tipo={tipo}
          numNota={numNota}
          usuarioLogado={usuarioLogado}
          dadosSabe={dadosSabeFiltrados}
          dadosSaeb={dadosSaebFiltrados}
          mostrarSabe={checkSabe}
          mostrarSaeb={checkSaeb}
        />
      )}

      {modoAtual === "documento" && (
        <DocumentoArea usuarioLogado={usuarioLogado} dataFormatada={formatarDataAtual()} numDoc={numDoc} />
      )}

      {modoAtual === "bahia" && <BahiaArea />}

      <PopupManager />
    </div>
  );
}
