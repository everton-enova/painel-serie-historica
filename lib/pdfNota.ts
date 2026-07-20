// Gera o PDF da nota no navegador (mesma renderização da tela) para envio
// ao Drive. Retorna o PDF em base64, ou null se a captura falhar — nesse
// caso o backend cai na conversão HTML→PDF do Google.

// A captura usa os estilos de TELA; este CSS replica o que o @media print do
// globals.css esconde/limpa, para o PDF sair igual ao impresso no PC.
const CSS_MODO_IMPRESSAO = `
  .no-print, .top-bar, #loginScreen, .doc-toolbar,
  .logo-placeholder, .logo-clear-btn, .logo-resize-handle, .logo-size-panel,
  .html-block-bar, .img-wrapper .resize-handle, .img-size-panel,
  .html-fixed-panel-header, .html-fixed-panel-body textarea, .html-fixed-panel-footer,
  .bahia-filtros-bar { display: none !important; }
  .img-wrapper.selected img,
  .logo-upload-wrap.logo-selected .logo-img-loaded { outline: none !important; }
  .html-block, .doc-title-editable, .analysis-box { border: none !important; background: transparent !important; }
  .html-fixed-render-area { border: none !important; }
`;

export async function gerarPdfBase64(el: HTMLElement): Promise<string | null> {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    // Blocos que não podem ser cortados entre páginas (mesma regra do CSS de
    // impressão): medidos no DOM real antes da captura. Os elementos que o
    // CSS_MODO_IMPRESSAO esconde são absolutos ou externos, não mudam o layout.
    const baseRect = el.getBoundingClientRect();
    const blocosDom = el.querySelectorAll(
      "table, .no-break, .bahia-chart-inline, .header-modern, .school-card, .analysis-box"
    );

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      onclone: (doc) => {
        const style = doc.createElement("style");
        style.textContent = CSS_MODO_IMPRESSAO;
        doc.head.appendChild(style);
      },
    });

    const fator = canvas.width / baseRect.width;
    const blocos: Array<{ top: number; bottom: number }> = [];
    blocosDom.forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.height <= 0) return;
      blocos.push({
        top: (r.top - baseRect.top) * fator,
        bottom: (r.bottom - baseRect.top) * fator,
      });
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const margem = 10;
    const larguraUtil = pdf.internal.pageSize.getWidth() - margem * 2;
    const alturaUtil = pdf.internal.pageSize.getHeight() - margem * 2;
    const pxPorMm = canvas.width / larguraUtil;
    const alturaPaginaPx = Math.floor(alturaUtil * pxPorMm);

    for (let y = 0, pagina = 0; y < canvas.height - 1; pagina++) {
      let corte = Math.min(y + alturaPaginaPx, canvas.height);
      if (corte < canvas.height) {
        // Recua o corte para a borda superior de qualquer bloco que ele
        // atravessaria — desde que isso não encolha a página demais (blocos
        // maiores que uma página são cortados mesmo).
        const minimo = y + alturaPaginaPx * 0.25;
        for (let mudou = true, guarda = 0; mudou && guarda < 20; guarda++) {
          mudou = false;
          for (const b of blocos) {
            if (b.top < corte && corte < b.bottom && b.top - 4 > minimo) {
              corte = Math.floor(b.top - 4);
              mudou = true;
            }
          }
        }
      }
      const alturaFatia = corte - y;
      const fatia = document.createElement("canvas");
      fatia.width = canvas.width;
      fatia.height = alturaFatia;
      const ctx = fatia.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, fatia.width, fatia.height);
      ctx.drawImage(canvas, 0, y, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);

      if (pagina > 0) pdf.addPage();
      pdf.addImage(
        fatia.toDataURL("image/jpeg", 0.85),
        "JPEG",
        margem,
        margem,
        larguraUtil,
        alturaFatia / pxPorMm
      );
      y = corte;
    }

    return pdf.output("datauristring").split(",")[1] ?? null;
  } catch (e) {
    console.error("gerarPdfBase64 falhou:", e);
    return null;
  }
}
