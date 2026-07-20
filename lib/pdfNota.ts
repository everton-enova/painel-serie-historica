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

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const margem = 10;
    const larguraUtil = pdf.internal.pageSize.getWidth() - margem * 2;
    const alturaUtil = pdf.internal.pageSize.getHeight() - margem * 2;
    const pxPorMm = canvas.width / larguraUtil;
    const alturaPaginaPx = Math.floor(alturaUtil * pxPorMm);

    for (let y = 0, pagina = 0; y < canvas.height; y += alturaPaginaPx, pagina++) {
      const alturaFatia = Math.min(alturaPaginaPx, canvas.height - y);
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
    }

    return pdf.output("datauristring").split(",")[1] ?? null;
  } catch (e) {
    console.error("gerarPdfBase64 falhou:", e);
    return null;
  }
}
