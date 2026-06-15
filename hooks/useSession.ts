"use client";

import { useCallback, useEffect, useState } from "react";
import type { RespostaLogin } from "@/lib/types";

const CHAVE_SESSAO = "painelSabeSession";
const TEMPO_SESSAO = 60 * 60 * 1000;

interface SessaoSalva {
  nome: string;
  timestamp: number;
}

export function useSession() {
  const [usuarioLogado, setUsuarioLogado] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_SESSAO);
      if (bruto) {
        const sessao: SessaoSalva = JSON.parse(bruto);
        const agora = new Date().getTime();
        if (agora - sessao.timestamp < TEMPO_SESSAO) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of localStorage session on mount
          setUsuarioLogado(sessao.nome);
        } else {
          localStorage.removeItem(CHAVE_SESSAO);
        }
      }
    } catch {
      localStorage.removeItem(CHAVE_SESSAO);
    }
    setVerificando(false);
  }, []);

  const login = useCallback(async (cpf: string) => {
    if (!cpf) {
      setErro("Digite seu CPF.");
      return;
    }

    setEntrando(true);
    setErro("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const dados: RespostaLogin = await res.json();

      if (dados.sucesso) {
        const sessao: SessaoSalva = { nome: dados.nome, timestamp: new Date().getTime() };
        localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
        setUsuarioLogado(dados.nome);
      } else {
        setErro(dados.msg || "CPF não encontrado.");
      }
    } catch (err) {
      setErro("Erro ao conectar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setEntrando(false);
    }
  }, []);

  const sair = useCallback(() => {
    localStorage.removeItem(CHAVE_SESSAO);
    location.reload();
  }, []);

  return { usuarioLogado, verificando, entrando, erro, login, sair };
}
