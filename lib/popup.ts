export type PopupTipo = "error" | "warning" | "success" | "info" | "input";

export interface PopupBotao {
  texto: string;
  classe: string;
  valor: unknown;
}

export interface PopupInput {
  id: string;
  label: string;
  placeholder?: string;
  valor?: string;
}

export interface PopupOptions {
  tipo?: PopupTipo;
  titulo?: string;
  subtitulo?: string;
  mensagem?: string;
  botoes?: PopupBotao[];
  inputs?: PopupInput[];
}

type Resolver = (valor: unknown) => void;

let showFn: ((opts: PopupOptions) => void) | null = null;
let hideFn: (() => void) | null = null;
let resolveFn: Resolver | null = null;

export function registerPopupManager(show: (opts: PopupOptions) => void, hide: () => void) {
  showFn = show;
  hideFn = hide;
  return () => {
    showFn = null;
    hideFn = null;
  };
}

export function mostrarPopup(opts: PopupOptions): Promise<unknown> {
  return new Promise((resolve) => {
    resolveFn = resolve;
    showFn?.(opts);
  });
}

export function fecharPopup(valor: unknown) {
  hideFn?.();
  if (resolveFn) {
    resolveFn(valor);
    resolveFn = null;
  }
}

export function popupAlerta(titulo: string, mensagem: string, tipo: PopupTipo = "error") {
  return mostrarPopup({
    tipo,
    titulo,
    mensagem,
    botoes: [{ texto: "Entendi", classe: "popup-btn-primary", valor: true }],
  });
}

export function popupPrompt(titulo: string, subtitulo: string, inputs: PopupInput[]) {
  return mostrarPopup({
    tipo: "input",
    titulo,
    subtitulo,
    inputs,
    botoes: [
      { texto: "Cancelar", classe: "popup-btn-cancel", valor: false },
      { texto: "Inserir", classe: "popup-btn-primary", valor: true },
    ],
  });
}
