"use client";

import { useState } from "react";

interface LoginScreenProps {
  entrando: boolean;
  erro: string;
  onLogin: (cpf: string) => void;
}

export default function LoginScreen({ entrando, erro, onLogin }: LoginScreenProps) {
  const [cpf, setCpf] = useState("");

  return (
    <div id="loginScreen">
      <div className="card-login text-center">
        <h4 className="mb-4 fw-bold text-primary">PAINEL SÉRIE HISTÓRICA</h4>
        <div className="mb-3 text-start">
          <label className="form-label fw-bold small text-secondary">CPF do Colaborador</label>
          <input
            type="text"
            id="cpfInput"
            className="form-control form-control-lg"
            placeholder="Apenas números"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLogin(cpf);
            }}
          />
        </div>
        <button
          id="btnLogin"
          onClick={() => onLogin(cpf)}
          className="btn btn-primary btn-lg w-100 mb-3"
          disabled={entrando}
        >
          {entrando ? "Verificando..." : "Entrar"}
        </button>
        <div id="loginError" className="text-danger small fw-bold">
          {erro}
        </div>
      </div>
    </div>
  );
}
