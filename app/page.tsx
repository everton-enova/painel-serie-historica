"use client";

import { useMemo, useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import PopupManager from "@/components/PopupManager";
import TopBar from "@/components/TopBar";
import RelatorioArea from "@/components/RelatorioArea";
import DocumentoArea from "@/components/DocumentoArea";
import BahiaArea from "@/components/BahiaArea";
import RecentesArea from "@/components/RecentesArea";
import SnapshotArea from "@/components/SnapshotArea";
import { useSession } from "@/hooks/useSession";
import { useTravaEdicao } from "@/hooks/useTravaEdicao";
import { popupAlerta } from "@/lib/popup";
import { correspondeRede } from "@/lib/normalize";
import { formatarDataAtual, nomeArquivoNota, ANO_NOTA } from "@/lib/formatters";
import type {
  BlocoSabe,
  BlocoSaeb,
  InfoEntidade,
  NotaAberta,
  RegionalOpcao,
  RespostaBusca,
} from "@/lib/types";

export type Modo = "escola" | "municipio" | "regional" | "documento" | "bahia" | "recentes";

interface RespostaSalvar {
  sucesso?: boolean;
  erro?: string;
  id?: string;
  atualizadoEm?: string;
  /** true quando outra pessoa está com a nota em edição (salvamento negado). */
  bloqueada?: boolean;
  editandoPor?: string;
}

export default function Home() {
  const { usuarioLogado, verificando, entrando, erro, login, sair } = useSession();

  const [modoAtual, setModoAtual] = useState<Modo>("bahia");
  const [searchInput, setSearchInput] = useState("");
  const [numNota, setNumNota] = useState("");
  const [numDoc, setNumDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatorioVisivel, setRelatorioVisivel] = useState(false);

  const [info, setInfo] = useState<InfoEntidade | null>(null);
  const [tipo, setTipo] = useState<"escola" | "municipio" | "regional">("escola");
  const [dadosSabeAtual, setDadosSabeAtual] = useState<BlocoSabe[]>([]);
  const [dadosSaebAtual, setDadosSaebAtual] = useState<Omit<BlocoSaeb, "raw">[]>([]);

  const [regionais, setRegionais] = useState<RegionalOpcao[]>([]);
  const [regionalSelecionada, setRegionalSelecionada] = useState("");

  // Nota salva atualmente vinculada (reaberta ou recém-salva): salvar de novo sobrescreve
  const [notaAbertaId, setNotaAbertaId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<NotaAberta | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Nota aberta por outra pessoa: visível, mas sem edição nem salvamento.
  const somenteLeitura = !!snapshot?.somenteLeitura;

  // Renova a reserva enquanto a nota está aberta; libera ao sair dela.
  useTravaEdicao(notaAbertaId, usuarioLogado || "", !somenteLeitura);

  const [checkSabe, setCheckSabe] = useState(true);
  const [checkSaeb, setCheckSaeb] = useState(true);
  const [checkSabeRedeMunicipal, setCheckSabeRedeMunicipal] = useState(true);
  const [checkSabeRedeEstadual, setCheckSabeRedeEstadual] = useState(true);
  const [checkSabeRedePublica, setCheckSabeRedePublica] = useState(true);
  const [checkSaebRedePublica, setCheckSaebRedePublica] = useState(true);
  const [checkSaebRedeMunicipal, setCheckSaebRedeMunicipal] = useState(true);
  const [checkSaebRedeEstadual, setCheckSaebRedeEstadual] = useState(true);

  const comFiltroRede = modoAtual === "municipio" || modoAtual === "regional";

  const redesSabeAtivas = useMemo(() => {
    const redes: string[] = [];
    if (checkSabeRedeMunicipal) redes.push("MUNICIPAL");
    if (checkSabeRedeEstadual) redes.push("ESTADUAL");
    if (checkSabeRedePublica) redes.push("PÚBLICA", "PUBLICA");
    return redes;
  }, [checkSabeRedeMunicipal, checkSabeRedeEstadual, checkSabeRedePublica]);

  const redesSaebAtivas = useMemo(() => {
    const redes: string[] = [];
    if (checkSaebRedePublica) redes.push("PÚBLICA", "PUBLICA");
    if (checkSaebRedeMunicipal) redes.push("MUNICIPAL");
    if (checkSaebRedeEstadual) redes.push("ESTADUAL");
    return redes;
  }, [checkSaebRedePublica, checkSaebRedeMunicipal, checkSaebRedeEstadual]);

  const dadosSabeFiltrados = useMemo(() => {
    if (comFiltroRede) {
      return dadosSabeAtual.filter((bloco) => correspondeRede(bloco.rede, redesSabeAtivas));
    }
    return dadosSabeAtual;
  }, [dadosSabeAtual, comFiltroRede, redesSabeAtivas]);

  const dadosSaebFiltrados = useMemo(() => {
    if (comFiltroRede) {
      return dadosSaebAtual.filter((bloco) => correspondeRede(bloco.rede, redesSaebAtivas));
    }
    return dadosSaebAtual;
  }, [dadosSaebAtual, comFiltroRede, redesSaebAtivas]);

  function carregarRegionais() {
    if (regionais.length > 0) return;
    fetch("/api/regionais")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setRegionais(d);
        else popupAlerta("Erro", d.erro || "Não foi possível carregar a lista de regionais.", "error");
      })
      .catch((e) =>
        popupAlerta("Erro", "Não foi possível carregar a lista de regionais.<br><br><small style=\"color:#999\">" + (e instanceof Error ? e.message : String(e)) + "</small>", "error")
      );
  }

  function trocarModo(modo: Modo) {
    setModoAtual(modo);
    // Fechar o snapshot solta a reserva de edição da nota reaberta.
    if (snapshot) setNotaAbertaId(null);
    setSnapshot(null);
    if (modo === "regional") carregarRegionais();
    if (modo !== "documento" && modo !== "bahia" && modo !== "recentes") {
      setSearchInput("");
      setDadosSabeAtual([]);
      setDadosSaebAtual([]);
      setRelatorioVisivel(false);
      setNotaAbertaId(null);
    }
  }

  async function buscar() {
    let url: string;
    if (modoAtual === "regional") {
      if (!regionalSelecionada) {
        popupAlerta("Regional", "Selecione uma regional (NTE) na lista.", "info");
        return;
      }
      url = `/api/regional?nte=${encodeURIComponent(regionalSelecionada)}`;
    } else {
      const codigo = searchInput.trim();
      if (!codigo) return;
      url =
        modoAtual === "escola"
          ? `/api/escola?coInep=${encodeURIComponent(codigo)}`
          : `/api/municipio?cd=${encodeURIComponent(codigo)}`;
    }

    setLoading(true);
    setRelatorioVisivel(false);

    try {
      const res = await fetch(url);
      const dados: RespostaBusca = await res.json();

      setLoading(false);

      if ("erro" in dados) {
        popupAlerta("Não encontrado", dados.erro, "warning");
        return;
      }

      setNotaAbertaId(null); // nova busca = nota nova (sobrescrita só por nº igual)
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

  function reabrirNota(nota: NotaAberta) {
    setSnapshot(nota);
    setNotaAbertaId(nota.id);
    if (nota.tipo === "documento") setNumDoc(nota.numero || "");
    else setNumNota(nota.numero || "");
  }

  // Rótulo das avaliações presentes na nota, para o título salvo:
  // "SABE", "Saeb" ou "SABE/Saeb" conforme os filtros marcados.
  function rotuloAvaliacoes(sabe: boolean, saeb: boolean): string {
    if (sabe && !saeb) return "SABE";
    if (!sabe && saeb) return "Saeb";
    return "SABE/Saeb";
  }

  // Salva o HTML da nota no Drive (aba Recentes) sem interromper o fluxo:
  // chamado pelo botão Salvar e também antes do PDF/Imprimir. Sem nada para
  // salvar, não faz nada; só exibe popup em caso de erro. Devolve o que
  // aconteceu, para o botão Salvar dar o retorno visual ao usuário.
  async function salvarNota(): Promise<"salvo" | "vazio" | "erro"> {
    // Nota aberta só para leitura (outra pessoa está editando): não sobrescreve.
    if (somenteLeitura) {
      popupAlerta(
        "Nota em edição",
        `<b>${snapshot?.editandoPor || "Outro usuário"}</b> está editando esta nota. ` +
          "Ela está aberta apenas para leitura e não será salva nos Recentes.",
        "warning"
      );
      return "erro";
    }

    let payload: {
      id: string | null;
      titulo: string;
      tipo: string;
      numero: string;
      entidade: string;
      autor: string;
      html: string;
    } | null = null;

    const num = numNota.trim();

    if (snapshot) {
      const el = document.getElementById("conteudoNotaSnapshot");
      if (el) {
        payload = {
          id: notaAbertaId,
          titulo: snapshot.titulo,
          tipo: snapshot.tipo,
          numero: snapshot.numero,
          entidade: snapshot.entidade,
          autor: usuarioLogado || "",
          html: el.innerHTML,
        };
      }
    } else if (modoAtual === "documento") {
      const el = document.getElementById("docEditorPage");
      const assunto = document.getElementById("docTituloEditavel")?.textContent?.trim() || "DOCUMENTO";
      if (el) {
        payload = {
          id: notaAbertaId,
          titulo: `${assunto} ${numDoc.trim() || "___"}/${ANO_NOTA}`,
          tipo: "documento",
          numero: numDoc.trim(),
          entidade: "-",
          autor: usuarioLogado || "",
          html: el.innerHTML,
        };
      }
    } else if (modoAtual === "bahia") {
      const el = document.getElementById("conteudoNotaBahia");
      if (el) {
        payload = {
          id: notaAbertaId,
          titulo: `NT-${num || "___"}_${ANO_NOTA}/CAV - Resultado do ${rotuloAvaliacoes(
            !!document.getElementById("secaoBahiaSabe"),
            !!document.getElementById("secaoBahiaSaeb")
          )} - BAHIA`,
          tipo: "bahia",
          numero: num,
          entidade: "ESTADO DA BAHIA",
          autor: usuarioLogado || "",
          html: el.innerHTML,
        };
      }
    } else if (relatorioVisivel && info) {
      const el = document.getElementById("conteudoNota");
      if (el) {
        payload = {
          id: notaAbertaId,
          titulo: `NT-${num || "___"}_${ANO_NOTA}/CAV - Resultado do ${rotuloAvaliacoes(checkSabe, checkSaeb)} - ${info.nome}`,
          tipo: modoAtual,
          numero: num,
          entidade: String(info.nome),
          autor: usuarioLogado || "",
          html: el.innerHTML,
        };
      }
    }

    if (!payload) return "vazio";

    setSalvando(true);
    try {
      const res = await fetch("/api/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "salvar", payload }),
      });
      const dados: RespostaSalvar = await res.json();
      if (dados.bloqueada) {
        popupAlerta("Nota em edição", dados.erro || "Outra pessoa está editando esta nota.", "warning");
        return "erro";
      }
      if (dados.erro || !dados.sucesso) {
        popupAlerta("Erro ao salvar nos Recentes", dados.erro || "Falha desconhecida.", "error");
        return "erro";
      }
      setNotaAbertaId(dados.id || null);
      return "salvo";
    } catch (err) {
      popupAlerta("Erro ao salvar nos Recentes", err instanceof Error ? err.message : String(err), "error");
      return "erro";
    } finally {
      setSalvando(false);
    }
  }

  // Botão 💾 SALVAR: grava a nota nos Recentes e confirma, sem imprimir —
  // permite parar aqui e retomar a edição depois pela aba Recentes.
  async function salvarManual() {
    const r = await salvarNota();
    if (r === "vazio") {
      popupAlerta(
        "Nada para salvar",
        "Gere uma nota (busque uma escola/município/regional, ou use Bahia/Documento) antes de salvar.",
        "info"
      );
      return;
    }
    if (r === "salvo") {
      popupAlerta(
        "Nota salva",
        "A nota foi gravada nos <b>Recentes</b>. Você pode fechar e continuar a edição depois pela aba 🕘 Recentes.",
        "success"
      );
    }
  }

  function nomeArquivoImpressao(): string | null {
    if (snapshot) {
      return nomeArquivoNota(snapshot.numero, snapshot.titulo);
    }
    if (modoAtual === "documento") {
      const assunto = document.getElementById("docTituloEditavel")?.textContent ?? "";
      return nomeArquivoNota(numDoc, assunto);
    }
    if (modoAtual === "bahia") {
      const assunto = document.getElementById("bahiaTituloNota")?.textContent ?? "";
      return nomeArquivoNota(numNota, assunto);
    }
    if (relatorioVisivel && info) {
      return nomeArquivoNota(numNota, String(info.nome));
    }
    return null;
  }

  async function imprimir() {
    // Antes de abrir a impressão, grava o HTML nos Recentes (Drive).
    await salvarNota();
    const nome = nomeArquivoImpressao();
    if (nome) {
      const tituloOriginal = document.title;
      document.title = nome;
      const restaurar = () => {
        document.title = tituloOriginal;
        window.removeEventListener("afterprint", restaurar);
      };
      window.addEventListener("afterprint", restaurar);
    }
    window.print();
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

  const mostraRelatorio =
    !snapshot &&
    (modoAtual === "escola" || modoAtual === "municipio" || modoAtual === "regional") &&
    relatorioVisivel &&
    info;

  return (
    <div id="mainScreen">
      <TopBar
        modoAtual={modoAtual}
        onTrocarModo={trocarModo}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onBuscar={buscar}
        regionais={regionais}
        regionalSelecionada={regionalSelecionada}
        onRegionalChange={setRegionalSelecionada}
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
        checkSabeRedePublica={checkSabeRedePublica}
        onCheckSabeRedePublicaChange={setCheckSabeRedePublica}
        checkSaebRedePublica={checkSaebRedePublica}
        onCheckSaebRedePublicaChange={setCheckSaebRedePublica}
        checkSaebRedeMunicipal={checkSaebRedeMunicipal}
        onCheckSaebRedeMunicipalChange={setCheckSaebRedeMunicipal}
        checkSaebRedeEstadual={checkSaebRedeEstadual}
        onCheckSaebRedeEstadualChange={setCheckSaebRedeEstadual}
        usuarioLogado={usuarioLogado}
        salvando={salvando}
        onSalvar={salvarManual}
        onImprimir={imprimir}
        onSair={sair}
      />

      {loading && (
        <div id="loading" className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="mt-2 fw-bold text-muted">Carregando dados...</div>
        </div>
      )}

      {snapshot && <SnapshotArea nota={snapshot} />}

      {mostraRelatorio && (
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

      {modoAtual === "documento" && !snapshot && (
        <DocumentoArea usuarioLogado={usuarioLogado} dataFormatada={formatarDataAtual()} numDoc={numDoc} />
      )}

      {modoAtual === "bahia" && !snapshot && <BahiaArea numNota={numNota} />}

      {modoAtual === "recentes" && !snapshot && (
        <RecentesArea onReabrir={reabrirNota} usuarioLogado={usuarioLogado} />
      )}

      <PopupManager />
    </div>
  );
}
