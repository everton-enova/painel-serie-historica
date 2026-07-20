// Gera o PDF da nota no navegador (mesma renderização da tela) para envio
// ao Drive. Retorna o PDF em base64, ou null se a captura falhar — nesse
// caso o backend cai na conversão HTML→PDF do Google.

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
  } catch {
    return null;
  }
}
