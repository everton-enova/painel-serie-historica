/**
 * Gera o PDF a partir do elemento já renderizado na tela.
 * As regras de @media print não valem aqui (o html2canvas rasteriza o estilo de
 * tela), por isso o onClone reaplica o essencial no clone antes da captura.
 */
export async function gerarPdfBase64(elementoId: string): Promise<string> {
  const elemento = document.getElementById(elementoId);
  if (!elemento) throw new Error(`Área de impressão "${elementoId}" não encontrada.`);

  const { default: html2pdf } = await import("html2pdf.js");

  const dataUri: string = await html2pdf()
    .set({
      margin: [15, 0, 15, 0],
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (doc: Document) => {
          const alvo = doc.getElementById(elementoId);
          if (!alvo) return;
          alvo.querySelectorAll(".no-print, .doc-toolbar").forEach((el) => el.remove());
          alvo.style.boxShadow = "none";
          alvo.style.border = "none";
          alvo.style.margin = "0 auto";
          alvo.style.paddingTop = "0";
          alvo.style.paddingBottom = "0";
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(elemento)
    .outputPdf("datauristring");

  return dataUri.split(",")[1];
}

export async function salvarNoDrive(nome: string, pdfBase64: string): Promise<string> {
  const res = await fetch("/api/drive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, pdfBase64 }),
  });
  const json = await res.json();
  if (!res.ok || json.erro) throw new Error(json.erro || `Falha ao salvar no Drive (${res.status}).`);
  return json.url as string;
}
