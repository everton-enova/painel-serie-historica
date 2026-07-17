/**
 * Cole este código no Apps Script da planilha:
 * Extensões → Apps Script → substitua o conteúdo → Salvar → Implantar → Nova implantação
 *   Tipo: App da Web
 *   Executar como: Eu (sua conta)
 *   Quem tem acesso: Qualquer pessoa
 * Copie a URL gerada e coloque em GOOGLE_APPS_SCRIPT_URL no .env.local
 */

// Opcional: cole aqui o ID da pasta do Drive onde os PDFs devem ser salvos
// (o trecho após /folders/ na URL da pasta). Vazio = usa/cria a pasta abaixo.
var PASTA_DRIVE_ID = '';
var NOME_PASTA_PADRAO = 'Painel Série Histórica - PDFs';

function doGet(e) {
  try {
    var sheetNames = (e.parameter.sheets || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);

    if (sheetNames.length === 0) {
      return jsonResponse({ erro: 'Nenhuma aba solicitada.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {};

    sheetNames.forEach(function(name) {
      try {
        var sheet = ss.getSheetByName(name);
        result[name] = sheet ? sheet.getDataRange().getValues() : [];
      } catch (_) {
        result[name] = [];
      }
    });

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ erro: err.message });
  }
}

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);

    if (dados.acao === 'salvarPdf') {
      if (!dados.nome || !dados.pdfBase64) {
        return jsonResponse({ erro: 'Informe nome e pdfBase64.' });
      }
      var bytes = Utilities.base64Decode(dados.pdfBase64);
      // "/" no nome (ex.: NT-001_2026/CAV) atrapalha o download do arquivo
      var nome = String(dados.nome).replace(/\//g, '-') + '.pdf';
      var blob = Utilities.newBlob(bytes, 'application/pdf', nome);
      var arquivo = obterPastaDestino().createFile(blob);
      return jsonResponse({ url: arquivo.getUrl(), nome: nome });
    }

    return jsonResponse({ erro: 'Ação desconhecida: ' + dados.acao });
  } catch (err) {
    return jsonResponse({ erro: err.message });
  }
}

function obterPastaDestino() {
  if (PASTA_DRIVE_ID) return DriveApp.getFolderById(PASTA_DRIVE_ID);
  var pastas = DriveApp.getFoldersByName(NOME_PASTA_PADRAO);
  return pastas.hasNext() ? pastas.next() : DriveApp.createFolder(NOME_PASTA_PADRAO);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
