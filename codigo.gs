/**
 * Cole este código no Apps Script da planilha:
 * Extensões → Apps Script → substitua o conteúdo → Salvar → Implantar → Nova implantação
 *   Tipo: App da Web
 *   Executar como: Eu (sua conta)
 *   Quem tem acesso: Qualquer pessoa
 * Copie a URL gerada e coloque em GOOGLE_APPS_SCRIPT_URL no .env.local
 */

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

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
