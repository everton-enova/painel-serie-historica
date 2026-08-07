/**
 * PAINEL SÉRIE HISTÓRICA — SABE / SAEB
 * Backend Apps Script (arquivo único)
 *
 * Fonte SABE: aba "SABE 19 a 25" (formato longo, coluna TIPO define o nível):
 *   TIPO = ESCOLA | MUNICIPIO | REGIONAL | ESTADO
 * Fonte Saeb: abas "Saeb_ESCOLA_SH" + "Saeb 25" (escola), "Saeb_MUN_SH" + "Saeb_MUN_25"
 *   (município) e "Saeb_BAHIA" (estado) — formato largo (IRyy/MATyy/LPyy/MPyy/IDEByy).
 * Login: aba "Colaboradores" (NOME_COLABORADOR | CPF).
 *
 * Implantar como App da Web (Executar como: Eu / Acesso: Qualquer pessoa).
 */

// ══════════════════ CONFIGURAÇÃO ══════════════════

var ABA_SABE = 'SABE 19 a 25';
var ABA_COLABORADORES = 'Colaboradores';
var ABAS_SAEB_ESCOLA = ['Saeb_ESCOLA_SH', 'Saeb 25'];
var ABAS_SAEB_MUNICIPIO = ['Saeb_MUN_SH', 'Saeb_MUN_25'];
var ABA_SAEB_BAHIA = 'Saeb_BAHIA';

// Edições SABE marcadas como preliminares no painel.
// Quando os resultados forem finalizados, deixe o array vazio: []
var EDICOES_PRELIMINARES = [];

// ══════════════════ WEB APP + API JSON ══════════════════
// Sem parâmetros: serve o Painel (Painel.html).
// Com ?fn=...: API por função usada pelo app Next.js na Vercel
//   (login, escola, municipio, regional, bahia, regionais, recentes,
//    abrir, sabeEstado). Escritas (salvar/excluir) via doPost.
// Com ?sheets=Aba1,Aba2: API JSON bruta (compatibilidade).

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var fn = String(p.fn || '').trim();
    if (fn) {
      switch (fn) {
        case 'login': return jsonResponse(verificarLogin(p.cpf));
        case 'escola': return jsonResponse(buscarDadosEscola(p.codigo));
        case 'municipio': return jsonResponse(buscarDadosMunicipio(p.codigo));
        case 'regional': return jsonResponse(buscarDadosRegional(p.nte));
        case 'bahia': return jsonResponse(buscarDadosBahia());
        case 'regionais': return jsonResponse(listarRegionais());
        case 'recentes': return jsonResponse(listarNotasSalvas());
        case 'lixeira': return jsonResponse(listarLixeira());
        case 'abrir': return jsonResponse(abrirNota(p.id, p.autor));
        case 'sabeEstado': return jsonResponse(sabeEstadoFlat());
        case 'diagnostico': return jsonResponse(diagnosticoDrive());
        case 'diagnosticoEscrita': return jsonResponse(diagnosticoEscritaDrive());
        default: return jsonResponse({ erro: 'Função desconhecida: ' + fn });
      }
    }

    var sheetNames = String(p.sheets || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (sheetNames.length === 0) {
      return HtmlService.createHtmlOutputFromFile('Painel')
        .setTitle('Painel Série Histórica')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
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

// Escritas do app Vercel: body JSON { fn: 'salvar'|'excluir'|'editando'|'liberar', ... }
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = String(body.fn || '');
    if (fn === 'salvar') return jsonResponse(salvarNota(body.payload || {}));
    if (fn === 'excluir') return jsonResponse(excluirNota(body.id));
    if (fn === 'restaurar') return jsonResponse(restaurarNota(body.id));
    if (fn === 'excluirDefinitivo') return jsonResponse(excluirDefinitivo(body.id));
    if (fn === 'editando') return jsonResponse(renovarEdicao(body.id, body.autor));
    if (fn === 'liberar') return jsonResponse(liberarEdicao(body.id, body.autor));
    return jsonResponse({ erro: 'Função POST desconhecida: ' + fn });
  } catch (err) {
    return jsonResponse({ erro: err.message });
  }
}

// Linhas SABE TIPO=ESTADO no formato plano consumido pela tela Bahia do
// app Vercel (substitui a aba SABE_BAHIA, excluída na reestruturação).
// Participação já normalizada em percentual (0–100).
function sabeEstadoFlat() {
  return _linhasSabe(function(o) { return o.tipo === 'ESTADO'; }).map(function(o) {
    return {
      edicao: String(o.edicao),
      estado: 'BAHIA',
      rede: _normRede(o.rede),
      etapa: _normEtapa(o.etapa),
      disciplina: String(o.disciplina == null ? '' : o.disciplina).trim(),
      previstos: _num(o.previstos),
      avaliados: _num(o.avaliados),
      participacao: _participacao(o.previstos, o.avaliados, o.part),
      proficiencia: _num(o.prof),
      padraoDesempenho: _normPadrao(o.padrao)
    };
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════ LOGIN ══════════════════

function verificarLogin(cpf) {
  var alvo = String(cpf || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!alvo) return { sucesso: false, msg: 'CPF inválido.' };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_COLABORADORES);
  if (!sh) return { sucesso: false, msg: 'Aba "' + ABA_COLABORADORES + '" não encontrada.' };
  var dados = sh.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    var c = String(dados[i][1] == null ? '' : dados[i][1]).replace(/\D/g, '').replace(/^0+/, '');
    if (c && c === alvo) return { sucesso: true, nome: String(dados[i][0]).trim() };
  }
  return { sucesso: false, msg: 'CPF não encontrado.' };
}

// ══════════════════ HELPERS DE NORMALIZAÇÃO ══════════════════

function _norm(s) {
  return String(s == null ? '' : s)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function _num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  var s = String(v).trim();
  if (s === '' || s === '-' || s === 'ND') return null;
  var n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function _normRede(r) {
  var n = _norm(r);
  if (n.indexOf('MUNIC') === 0) return 'MUNICIPAL';
  if (n.indexOf('ESTAD') === 0) return 'ESTADUAL';
  if (n.indexOf('PUBLIC') === 0) return 'PÚBLICA';
  return n || '-';
}

function _normEtapa(e) {
  var n = _norm(e);
  if (n.indexOf('MEDIO') >= 0 || n.indexOf('3ª SERIE') >= 0 || n.indexOf('3A SERIE') >= 0) return '3ª SÉRIE EM';
  var m = n.match(/(\d)\s*º\s*ANO/);
  if (m) return m[1] + 'º ANO EF';
  return String(e == null ? '' : e).trim();
}

function _normPadrao(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s || s === '-' || s === '-7') return '';
  if (_norm(s).indexOf('NAO HOUVE') >= 0) return '';
  return s;
}

// Participação: recalcula de AVALIADOS/PREVISTOS quando possível;
// senão normaliza a coluna (valores em fração ≤ 5 viram percentual).
function _participacao(previstos, avaliados, coluna) {
  var p = _num(previstos), a = _num(avaliados);
  if (p != null && p > 0 && a != null) return (a / p) * 100;
  var c = _num(coluna);
  if (c == null) return null;
  return c <= 5 ? c * 100 : c;
}

// Extrai o número do NTE de qualquer variação de nome de regional.
function _nteNum(regional) {
  var m = String(regional == null ? '' : regional).match(/NTE\s*0?(\d{1,2})/i);
  return m ? parseInt(m[1], 10) : null;
}

function _dataHoje() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Bahia', 'dd/MM/yyyy');
}

// ══════════════════ LEITURA DA ABA SABE ══════════════════

function _linhasSabe(filtro) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_SABE);
  if (!sh) throw new Error('Aba "' + ABA_SABE + '" não encontrada.');
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];

  var ix = {};
  vals[0].forEach(function(h, i) { var k = _norm(h); if (!(k in ix)) ix[k] = i; });
  function col(nome) {
    var i = ix[_norm(nome)];
    if (i == null) throw new Error('Coluna "' + nome + '" não encontrada na aba ' + ABA_SABE + '.');
    return i;
  }

  var cEd = col('EDICAO'), cTipo = col('TIPO'), cRede = col('REDE'), cReg = col('REGIONAL'),
      cMun = col('CD_MUNICIPIO'), cNomeMun = col('MUNICIPIO'), cInep = col('CO_INEP'),
      cEsc = col('ESCOLA'), cEtapa = col('ETAPA'), cDisc = col('DISCIPLINA'),
      cProf = col('PROFICIENCIA'), cPad = col('PADRAO DE DESEMPENHO'),
      cPrev = col('PREVISTOS'), cAval = col('AVALIADOS'), cPart = col('PARTICIPACAO (%)');

  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    var obj = {
      edicao: parseInt(String(r[cEd]).trim(), 10),
      tipo: _norm(r[cTipo]),
      rede: r[cRede],
      regional: r[cReg],
      cdMunicipio: String(r[cMun] == null ? '' : r[cMun]).trim(),
      municipio: r[cNomeMun],
      coInep: String(r[cInep] == null ? '' : r[cInep]).trim(),
      escola: r[cEsc],
      etapa: r[cEtapa],
      disciplina: r[cDisc],
      prof: r[cProf],
      padrao: r[cPad],
      previstos: r[cPrev],
      avaliados: r[cAval],
      part: r[cPart]
    };
    if (isNaN(obj.edicao)) continue; // ignora linhas sem edição válida
    if (filtro(obj)) out.push(obj);
  }
  return out;
}

// ══════════════════ MONTAGEM DOS BLOCOS SABE ══════════════════

function _montarHistoricoSabe(linhas) {
  var mapa = {};
  linhas.forEach(function(r) {
    var etapa = _normEtapa(r.etapa);
    var rede = _normRede(r.rede);
    var chave = etapa + '|' + rede;
    if (!mapa[chave]) mapa[chave] = { etapa: etapa, rede: rede, edicoes: {} };
    var e = mapa[chave].edicoes[r.edicao];
    if (!e) e = mapa[chave].edicoes[r.edicao] = { edicao: r.edicao, lp: {}, mt: {}, participacao: {} };

    var alvo = _norm(r.disciplina).indexOf('MATEMATICA') >= 0 ? 'mt' : 'lp';
    e[alvo] = { nota: _num(r.prof), padrao: _normPadrao(r.padrao) };

    var p = _participacao(r.previstos, r.avaliados, r.part);
    if (p != null) e.participacao.percentual = p;
  });

  var ordemEtapa = { '2º ANO EF': 1, '5º ANO EF': 2, '9º ANO EF': 3, '3ª SÉRIE EM': 4 };
  var ordemRede = { 'ESTADUAL': 1, 'MUNICIPAL': 2, 'PÚBLICA': 3 };

  var blocos = Object.keys(mapa).map(function(k) {
    var b = mapa[k];
    var linhasBloco = Object.keys(b.edicoes)
      .map(Number)
      .sort(function(a, c) { return a - c; })
      .map(function(ed) { return b.edicoes[ed]; });

    for (var i = 0; i < linhasBloco.length; i++) {
      var l = linhasBloco[i];
      l.preliminar = EDICOES_PRELIMINARES.indexOf(l.edicao) >= 0;
      var ant = i > 0 ? linhasBloco[i - 1] : null;
      if (ant) {
        if (l.lp.nota != null && ant.lp.nota != null) l.lp.diff = l.lp.nota - ant.lp.nota;
        if (l.mt.nota != null && ant.mt.nota != null) l.mt.diff = l.mt.nota - ant.mt.nota;
        if (l.participacao.percentual != null && ant.participacao.percentual != null) {
          l.participacao.diff = l.participacao.percentual - ant.participacao.percentual;
        }
      }
    }

    return {
      etapa: b.etapa,
      rede: b.rede,
      linhas: linhasBloco,
      temPreliminar: linhasBloco.some(function(l) { return l.preliminar; })
    };
  });

  blocos.sort(function(a, b) {
    var ra = ordemRede[a.rede] || 9, rb = ordemRede[b.rede] || 9;
    if (ra !== rb) return ra - rb;
    return (ordemEtapa[a.etapa] || 9) - (ordemEtapa[b.etapa] || 9);
  });

  return blocos;
}

// ══════════════════ SAEB (formato largo) ══════════════════

function _blocosSaebDeAba(sheetName, matcher) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) return [];
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];

  var ix = {};
  vals[0].forEach(function(h, i) { var k = _norm(h); if (!(k in ix)) ix[k] = i; });

  // Mapeia colunas de anos: IR19, MAT19, LP19, MP19, IDEB19, ..., IDEB25
  var anos = {};
  vals[0].forEach(function(h, i) {
    var m = _norm(h).match(/^(IR|MAT|LP|MP|IDEB)(\d{2})$/);
    if (m) {
      var ano = '20' + m[2];
      if (!anos[ano]) anos[ano] = {};
      anos[ano][m[1].toLowerCase()] = i;
    }
  });
  var listaAnos = Object.keys(anos).sort();

  var out = [];
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r];
    var ctx = matcher(row, ix);
    if (!ctx) continue;

    var dadosAnos = [];
    listaAnos.forEach(function(ano) {
      var c = anos[ano];
      var d = {
        ano: parseInt(ano, 10),
        ir: _num(c.ir != null ? row[c.ir] : null),
        mat: _num(c.mat != null ? row[c.mat] : null),
        lp: _num(c.lp != null ? row[c.lp] : null),
        mp: _num(c.mp != null ? row[c.mp] : null),
        ideb: _num(c.ideb != null ? row[c.ideb] : null)
      };
      if (d.ir != null || d.mat != null || d.lp != null || d.mp != null || d.ideb != null) dadosAnos.push(d);
    });

    if (dadosAnos.length) out.push({ etapa: ctx.etapa, rede: ctx.rede, municipio: ctx.municipio, dadosAnos: dadosAnos });
  }
  return out;
}

// Junta blocos de várias abas (ex.: Saeb_ESCOLA_SH + Saeb 25) por etapa|rede.
function _mesclarBlocosSaeb(listas) {
  var mapa = {};
  var ordem = [];
  listas.forEach(function(blocos) {
    blocos.forEach(function(b) {
      var chave = _norm(b.etapa) + '|' + _norm(b.rede);
      if (!mapa[chave]) { mapa[chave] = b; ordem.push(chave); return; }
      var alvo = mapa[chave];
      b.dadosAnos.forEach(function(d) {
        var existente = alvo.dadosAnos.filter(function(x) { return x.ano === d.ano; })[0];
        if (existente) {
          ['ir', 'mat', 'lp', 'mp', 'ideb'].forEach(function(c) { if (d[c] != null) existente[c] = d[c]; });
        } else {
          alvo.dadosAnos.push(d);
        }
      });
      alvo.dadosAnos.sort(function(a, c) { return a.ano - c.ano; });
    });
  });
  return ordem.map(function(k) { return mapa[k]; });
}

function _saebEscola(coInep) {
  var listas = ABAS_SAEB_ESCOLA.map(function(aba) {
    return _blocosSaebDeAba(aba, function(row, ix) {
      var cInep = ix['CO_INEP'];
      if (cInep == null) return null;
      if (String(row[cInep] == null ? '' : row[cInep]).trim() !== coInep) return null;
      return {
        etapa: row[ix['ETAPA']],
        rede: _normRede(row[ix['REDE']]),
        municipio: row[ix['ESCOLA']]
      };
    });
  });
  return _mesclarBlocosSaeb(listas);
}

function _saebMunicipio(cdMunicipio) {
  var listas = ABAS_SAEB_MUNICIPIO.map(function(aba) {
    return _blocosSaebDeAba(aba, function(row, ix) {
      var cCod = ix['CODIGO DO MUNICIPIO'];
      if (cCod == null) return null;
      if (String(row[cCod] == null ? '' : row[cCod]).trim() !== cdMunicipio) return null;
      return {
        etapa: row[ix['ETAPA']],
        rede: _normRede(row[ix['REDE']]),
        municipio: row[ix['NOME DO MUNICIPIO']]
      };
    });
  });
  return _mesclarBlocosSaeb(listas);
}

function _saebBahia() {
  return _blocosSaebDeAba(ABA_SAEB_BAHIA, function(row, ix) {
    return {
      etapa: row[ix['ETAPA']],
      rede: _normRede(row[ix['REDE']]),
      municipio: 'BAHIA'
    };
  });
}

// ══════════════════ ENDPOINTS DO PAINEL ══════════════════

function buscarDadosEscola(codigo) {
  var cod = String(codigo || '').trim();
  if (!cod) return { erro: 'Informe o código INEP.' };

  var linhas = _linhasSabe(function(o) { return o.tipo === 'ESCOLA' && o.coInep === cod; });
  var saeb = _saebEscola(cod);
  if (!linhas.length && !saeb.length) return { erro: 'Nenhum dado encontrado para o código INEP ' + cod + '.' };

  var ref = linhas[0];
  var nome = ref ? String(ref.escola).trim() : (saeb[0] ? String(saeb[0].municipio).trim() : 'ESCOLA ' + cod);
  var regional = ref ? String(ref.regional).trim() : '-';
  var municipio = ref ? String(ref.municipio).trim() : '-';

  return {
    tipo: 'escola',
    info: { nome: nome, codigo: cod, regional: regional, municipio: municipio, dataAtual: _dataHoje() },
    historico: _montarHistoricoSabe(linhas),
    saeb: saeb
  };
}

function buscarDadosMunicipio(codigo) {
  var cod = String(codigo || '').trim();
  if (!cod) return { erro: 'Informe o código do município.' };

  var linhas = _linhasSabe(function(o) { return o.tipo === 'MUNICIPIO' && o.cdMunicipio === cod; });
  var saeb = _saebMunicipio(cod);
  if (!linhas.length && !saeb.length) return { erro: 'Nenhum dado encontrado para o código de município ' + cod + '.' };

  var ref = linhas[0];
  var nome = ref ? String(ref.municipio).trim() : (saeb[0] ? String(saeb[0].municipio).trim() : 'MUNICÍPIO ' + cod);
  var regional = ref ? String(ref.regional).trim() : '-';

  return {
    tipo: 'municipio',
    info: { nome: nome, codigo: cod, regional: regional, dataAtual: _dataHoje() },
    historico: _montarHistoricoSabe(linhas),
    saeb: saeb
  };
}

function buscarDadosRegional(nte) {
  var n = parseInt(nte, 10);
  if (isNaN(n)) return { erro: 'Selecione uma regional (NTE).' };

  // Matching pelo número do NTE resolve as variações de grafia entre edições.
  var linhas = _linhasSabe(function(o) { return o.tipo === 'REGIONAL' && _nteNum(o.regional) === n; });
  if (!linhas.length) return { erro: 'Nenhum dado encontrado para o NTE ' + n + '.' };

  // Nome de exibição: prioriza a grafia da edição mais recente
  var maisRecente = linhas.reduce(function(a, b) { return b.edicao > a.edicao ? b : a; }, linhas[0]);
  var nome = String(maisRecente.regional).trim();
  var codigoNte = 'NTE ' + ('0' + n).slice(-2);

  // Abrangência: quantidade de municípios da regional (linhas TIPO=MUNICIPIO)
  var municipios = {};
  _linhasSabe(function(o) {
    if (o.tipo === 'MUNICIPIO' && _nteNum(o.regional) === n && o.cdMunicipio && o.cdMunicipio !== '-') {
      municipios[o.cdMunicipio] = true;
    }
    return false; // só usado para varrer; não coleta linhas
  });
  var qtd = Object.keys(municipios).length;

  return {
    tipo: 'regional',
    info: {
      nome: nome,
      codigo: codigoNte,
      regional: qtd > 0 ? qtd + ' municípios' : 'Estado da Bahia',
      dataAtual: _dataHoje()
    },
    historico: _montarHistoricoSabe(linhas),
    saeb: [] // Saeb regional: sem fonte por enquanto (reestruturação futura)
  };
}

function buscarDadosBahia() {
  var linhas = _linhasSabe(function(o) { return o.tipo === 'ESTADO'; });
  var saeb = _saebBahia();
  if (!linhas.length && !saeb.length) return { erro: 'Nenhum dado estadual encontrado.' };

  return {
    tipo: 'bahia',
    info: {
      nome: 'ESTADO DA BAHIA',
      codigo: 'BAHIA',
      regional: '27 NTEs • 417 municípios',
      dataAtual: _dataHoje()
    },
    historico: _montarHistoricoSabe(linhas),
    saeb: saeb
  };
}

// Lista as 27 regionais para o dropdown, deduplicadas pelo número do NTE.
function listarRegionais() {
  var porNum = {};
  _linhasSabe(function(o) {
    var n = _nteNum(o.regional);
    if (n != null) {
      var atual = porNum[n];
      // prioriza o nome vindo das linhas TIPO=REGIONAL (grafia oficial mais recente)
      if (!atual || (o.tipo === 'REGIONAL' && (!atual.oficial || o.edicao > atual.edicao))) {
        porNum[n] = { nome: String(o.regional).trim(), oficial: o.tipo === 'REGIONAL', edicao: o.edicao };
      }
    }
    return false;
  });
  return Object.keys(porNum)
    .map(Number)
    .sort(function(a, b) { return a - b; })
    .map(function(n) { return { num: n, nome: porNum[n].nome }; });
}

// ══════════════════ NOTAS SALVAS (Drive + aba índice) ══════════════════
// As notas são gravadas em pastas fixas do Drive do proprietário:
//   PASTA_PDF_ID  → legado (PDFs de versões antigas)
//   PASTA_HTML_ID → HTML dos "recentes", reeditável no painel
// Não há aba de índice na planilha: a pasta do Drive É o índice. O id da nota
// é o id do arquivo HTML e os metadados (tipo/entidade/numero/autor) ficam na
// descrição do arquivo, em JSON.

var PASTA_PDF_ID = '1GOsFZZhfBvKwIsTTXcTFuNr6ZkqL83zn';
var PASTA_HTML_ID = '1E7vAjG2J_SFJ4VgKZVc_PgnK3-tp1N5W';

// Execute esta função UMA VEZ no editor do Apps Script (Executar ▶) para
// autorizar o acesso ao Drive e conferir se as duas pastas estão acessíveis.
// O log deve mostrar os nomes das pastas.
function autorizarDrive() {
  var pastas = _pastasNotas();
  Logger.log('Acesso OK — HTML: "' + pastas.html.getName() + '" | PDF: "' + pastas.pdf.getName() + '"');
}

// Diagnóstico de escrita via URL: /exec?fn=diagnosticoEscrita
// Cria e apaga um arquivo de teste em cada pasta para validar a permissão.
function diagnosticoEscritaDrive() {
  var out = { escritaHtml: '', escritaPdf: '' };
  var pastas;
  try {
    pastas = _pastasNotas();
  } catch (e0) {
    return { erro: e0.message };
  }
  try {
    var f1 = pastas.html.createFile(Utilities.newBlob('teste', 'text/plain', '_teste_permissao.txt'));
    f1.setTrashed(true);
    out.escritaHtml = 'OK';
  } catch (e1) {
    out.escritaHtml = 'FALHOU: ' + e1.message;
  }
  try {
    var f2 = pastas.pdf.createFile(Utilities.newBlob('teste', 'text/plain', '_teste_permissao.txt'));
    f2.setTrashed(true);
    out.escritaPdf = 'OK';
  } catch (e2) {
    out.escritaPdf = 'FALHOU: ' + e2.message;
  }
  return out;
}

// Diagnóstico via URL: /exec?fn=diagnostico
// Mostra em qual conta o Web App executa e se o Drive está acessível.
function diagnosticoDrive() {
  var out = { versao: 'v12', executaComo: '', pastaHtml: '', pastaPdf: '', erroDrive: '' };
  try {
    out.executaComo = Session.getEffectiveUser().getEmail() || '(vazio)';
  } catch (e0) {
    out.executaComo = '(indisponível: ' + e0.message + ')';
  }
  try {
    var pastas = _pastasNotas();
    out.pastaHtml = pastas.html.getName();
    out.pastaPdf = pastas.pdf.getName();
  } catch (e) {
    out.erroDrive = e.message;
  }
  return out;
}

function _pastasNotas() {
  try {
    return {
      html: DriveApp.getFolderById(PASTA_HTML_ID),
      pdf: DriveApp.getFolderById(PASTA_PDF_ID)
    };
  } catch (e) {
    throw new Error('Pasta do Drive não encontrada ou sem acesso. Confira PASTA_PDF_ID / PASTA_HTML_ID no Código.gs e se a implantação roda na conta do proprietário das pastas. (' + e.message + ')');
  }
}

function _agora() {
  // Fuso fixo: não depende do fuso do projeto Apps Script.
  return Utilities.formatDate(new Date(), 'America/Bahia', 'dd/MM/yyyy HH:mm');
}

function _fmtData(d) {
  return Utilities.formatDate(d, 'America/Bahia', 'dd/MM/yyyy HH:mm');
}

// Metadados da nota guardados na descrição do arquivo HTML (JSON).
function _metaNota(file) {
  try {
    var m = JSON.parse(file.getDescription() || '{}');
    return { tipo: String(m.tipo || '-'), entidade: String(m.entidade || '-'), numero: String(m.numero || ''), autor: String(m.autor || '-') };
  } catch (e) {
    return { tipo: '-', entidade: '-', numero: '', autor: '-' };
  }
}

function _tituloNota(file) {
  return String(file.getName()).replace(/\.html?$/i, '');
}

// Documento HTML completo salvo no Drive. O conteúdo original fica entre os
// marcadores NOTA-INICIO/NOTA-FIM para ser extraído intacto ao reabrir.
function _docCompletoNota(titulo, htmlInterno) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (titulo || 'Nota') + '</title><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333;margin:24px;}' +
    'table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:10px;}' +
    'th{background:#002060;color:#fff;padding:6px 5px;text-align:center;font-size:8pt;}' +
    'td{padding:6px 5px;border-bottom:1px solid #e0e0e0;text-align:center;}' +
    '.section-title{font-size:10pt;font-weight:bold;color:#002060;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:5px;margin:20px 0 10px;}' +
    '.school-card{background:#f8f9fa;border-left:5px solid #002060;padding:12px;margin-bottom:20px;}' +
    '.school-name{font-size:11pt;font-weight:bold;text-transform:uppercase;}' +
    '.analysis-box{font-size:9.5pt;line-height:1.5;text-align:justify;margin-bottom:12px;}' +
    '.header-title{font-size:16pt;font-weight:bold;color:#002060;text-transform:uppercase;}' +
    '.header-meta{font-size:8pt;color:#666;}' +
    '.badge-nivel{padding:2px 6px;border-radius:10px;font-size:7.5pt;}' +
    '.footer-mini{font-size:7pt;color:#999;text-align:center;margin-top:20px;}' +
    'img{max-width:100%;}' +
    '</style></head><body><!--NOTA-INICIO-->' + htmlInterno + '<!--NOTA-FIM--></body></html>';
}

function _linkDrive(fileId) {
  return fileId ? 'https://drive.google.com/file/d/' + fileId + '/view' : '';
}

// Salva (ou sobrescreve) uma nota. Sobrescreve quando payload.id (id do
// arquivo HTML) existe ou quando já há nota do mesmo tipo com o mesmo número.
function salvarNota(payload) {
  if (!payload || !payload.html) return { erro: 'Nada para salvar.' };

  var pastas = _pastasNotas();
  var titulo = String(payload.titulo || 'NOTA').trim();
  var nomeBase = titulo.replace(/[\\\/:*?"<>|]/g, '-');
  var docHtml = _docCompletoNota(titulo, payload.html);
  var meta = JSON.stringify({
    tipo: payload.tipo || '-',
    entidade: payload.entidade || '-',
    numero: payload.numero || '',
    autor: payload.autor || '-'
  });

  // Não sobrescreve nota que outra pessoa está editando agora.
  if (payload.id) {
    var ocupada = _editandoPorOutro(payload.id, payload.autor);
    if (ocupada) {
      return {
        erro: ocupada.autor + ' está editando esta nota desde ' + ocupada.desde + '. Salvamento bloqueado para não sobrescrever o trabalho de outra pessoa.',
        bloqueada: true,
        editandoPor: ocupada.autor
      };
    }
  }

  var htmlFile = null;
  if (payload.id) {
    try {
      var f = DriveApp.getFileById(String(payload.id));
      if (!f.isTrashed()) htmlFile = f;
    } catch (e1) {}
  }
  if (!htmlFile && payload.numero) {
    var it = pastas.html.getFiles();
    while (it.hasNext()) {
      var cand = it.next();
      var m = _metaNota(cand);
      if (m.tipo === String(payload.tipo) && m.numero === String(payload.numero)) { htmlFile = cand; break; }
    }
    // Achou pelo número: vale a mesma trava de edição.
    if (htmlFile) {
      var ocupadaNum = _editandoPorOutro(htmlFile.getId(), payload.autor);
      if (ocupadaNum) {
        return {
          erro: ocupadaNum.autor + ' está editando a nota nº ' + payload.numero + ' desde ' + ocupadaNum.desde + '. Salvamento bloqueado para não sobrescrever o trabalho de outra pessoa.',
          bloqueada: true,
          editandoPor: ocupadaNum.autor
        };
      }
    }
  }

  if (htmlFile) {
    htmlFile.setContent(docHtml);
    htmlFile.setName(nomeBase + '.html');
  } else {
    htmlFile = pastas.html.createFile(Utilities.newBlob(docHtml, 'text/html', nomeBase + '.html'));
  }
  htmlFile.setDescription(meta);
  // Quem salvou continua com a nota reservada (o painel segue no heartbeat).
  _gravarLock(htmlFile.getId(), payload.autor);

  return {
    sucesso: true,
    id: htmlFile.getId(),
    urlHtml: _linkDrive(htmlFile.getId()),
    atualizadoEm: _agora()
  };
}

function listarNotasSalvas() {
  var pastas = _pastasNotas();
  var out = [];
  var it = pastas.html.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    // Ignora notas na lixeira (soft-delete)
    try {
      var descRaw = JSON.parse(f.getDescription() || '{}');
      if (descRaw.lixeiraEm) continue;
    } catch (e) {}
    var meta = _metaNota(f);
    out.push({
      id: f.getId(),
      titulo: _tituloNota(f),
      tipo: meta.tipo,
      entidade: meta.entidade,
      numero: meta.numero,
      autor: meta.autor,
      criadoEm: _fmtData(f.getDateCreated()),
      atualizadoEm: _fmtData(f.getLastUpdated()),
      _ts: f.getLastUpdated().getTime(),
      urlHtml: _linkDrive(f.getId()),
      urlPdf: '',
      editandoPor: '',
      editandoDesde: ''
    });
  }
  // Uma leitura em lote do cache marca quais notas estão em edição agora.
  if (out.length) {
    var chaves = out.map(function(n) { return _chaveEdicao(n.id); });
    var locks = {};
    try {
      locks = CacheService.getScriptCache().getAll(chaves) || {};
    } catch (e) {}
    out.forEach(function(n) {
      var raw = locks[_chaveEdicao(n.id)];
      if (!raw) return;
      try {
        var lock = JSON.parse(raw);
        n.editandoPor = String(lock.autor || '');
        n.editandoDesde = String(lock.desde || '');
      } catch (e2) {}
    });
  }
  out.sort(function(a, b) { return b._ts - a._ts; });
  for (var i = 0; i < out.length; i++) delete out[i]._ts;
  return out;
}

// Abre a nota e, de quebra, reserva a edição para o autor. Se outra pessoa
// estiver editando, devolve somenteLeitura: true — o painel abre a nota sem
// permitir edição nem sobrescrita.
function abrirNota(id, autor) {
  var file;
  try {
    file = DriveApp.getFileById(String(id));
    if (file.isTrashed()) return { erro: 'Nota não encontrada (está na lixeira do Drive).' };
  } catch (e) {
    return { erro: 'Arquivo não encontrado no Drive (pode ter sido excluído): ' + e.message };
  }
  var conteudo = file.getBlob().getDataAsString('UTF-8');
  var m = conteudo.match(/<!--NOTA-INICIO-->([\s\S]*?)<!--NOTA-FIM-->/);
  var meta = _metaNota(file);
  var reserva = reservarEdicao(file.getId(), autor);
  return {
    sucesso: true,
    id: file.getId(),
    titulo: _tituloNota(file),
    tipo: meta.tipo,
    entidade: meta.entidade,
    numero: meta.numero,
    html: m ? m[1] : conteudo,
    somenteLeitura: !!reserva.ocupado,
    editandoPor: reserva.editandoPor || '',
    editandoDesde: reserva.desde || ''
  };
}

// ══════════════════ TRAVA DE EDIÇÃO (presença) ══════════════════
// Quem abre uma nota para editar reserva a nota no CacheService do script
// (compartilhado entre todos os usuários do Web App). A reserva expira sozinha
// em LOCK_TTL_SEG segundos e é renovada por um "heartbeat" do painel enquanto
// a nota estiver aberta — se o navegador fechar sem avisar, a trava cai sozinha.

var LOCK_TTL_SEG = 150; // reserva expira em 2min30; painel renova a cada ~45s

function _chaveEdicao(id) {
  return 'edit:' + String(id);
}

function _lerLock(id) {
  try {
    var raw = CacheService.getScriptCache().get(_chaveEdicao(id));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _gravarLock(id, autor) {
  var atual = _lerLock(id);
  var lock = {
    autor: String(autor || '-'),
    desde: (atual && atual.autor === String(autor || '-') && atual.desde) || _agora()
  };
  CacheService.getScriptCache().put(_chaveEdicao(id), JSON.stringify(lock), LOCK_TTL_SEG);
  return lock;
}

// Quem está editando a nota, ignorando o próprio usuário. '' quando livre.
function _editandoPorOutro(id, autor) {
  var lock = _lerLock(id);
  if (!lock || !lock.autor) return null;
  if (String(lock.autor) === String(autor || '')) return null;
  return lock;
}

// Reserva a nota para o autor. Se outra pessoa já estiver editando, devolve
// { ocupado: true, editandoPor, desde } e NÃO toma a trava.
function reservarEdicao(id, autor) {
  var trava = LockService.getScriptLock();
  try {
    trava.waitLock(5000);
  } catch (e) {
    return { ocupado: false, editandoPor: '' };
  }
  try {
    var outro = _editandoPorOutro(id, autor);
    if (outro) return { ocupado: true, editandoPor: outro.autor, desde: outro.desde };
    _gravarLock(id, autor);
    return { ocupado: false, editandoPor: '' };
  } finally {
    trava.releaseLock();
  }
}

// Heartbeat do painel: renova a reserva enquanto a nota está aberta.
function renovarEdicao(id, autor) {
  if (!id) return { erro: 'Nota não informada.' };
  var outro = _editandoPorOutro(id, autor);
  if (outro) return { ocupado: true, editandoPor: outro.autor, desde: outro.desde };
  _gravarLock(id, autor);
  return { sucesso: true, ocupado: false };
}

// Libera a reserva ao fechar/sair da nota (só o dono da trava consegue).
function liberarEdicao(id, autor) {
  if (!id) return { sucesso: true };
  var lock = _lerLock(id);
  if (lock && String(lock.autor) === String(autor || '')) {
    CacheService.getScriptCache().remove(_chaveEdicao(id));
  }
  return { sucesso: true };
}

// Soft-delete: marca a nota com lixeiraEm nos metadados em vez de excluir.
// A purga automática (7 dias) roda ao listar a lixeira.
var DIAS_LIXEIRA = 7;

function excluirNota(id) {
  try {
    var file = DriveApp.getFileById(String(id));
    if (file.isTrashed()) return { erro: 'Nota não encontrada.' };
    var meta = {};
    try { meta = JSON.parse(file.getDescription() || '{}'); } catch (e) {}
    meta.lixeiraEm = new Date().toISOString();
    file.setDescription(JSON.stringify(meta));
    // Prefixo visual no nome para não confundir no Drive
    var nome = file.getName();
    if (!nome.startsWith('[LIXEIRA] ')) file.setName('[LIXEIRA] ' + nome);
    return { sucesso: true };
  } catch (e) {
    return { erro: 'Nota não encontrada: ' + e.message };
  }
}

function restaurarNota(id) {
  try {
    var file = DriveApp.getFileById(String(id));
    if (file.isTrashed()) return { erro: 'Nota não encontrada.' };
    var meta = {};
    try { meta = JSON.parse(file.getDescription() || '{}'); } catch (e) {}
    delete meta.lixeiraEm;
    file.setDescription(JSON.stringify(meta));
    var nome = file.getName().replace(/^\[LIXEIRA\] /, '');
    file.setName(nome);
    return { sucesso: true };
  } catch (e) {
    return { erro: 'Erro ao restaurar: ' + e.message };
  }
}

function excluirDefinitivo(id) {
  try {
    DriveApp.getFileById(String(id)).setTrashed(true);
    return { sucesso: true };
  } catch (e) {
    return { erro: 'Nota não encontrada: ' + e.message };
  }
}

function listarLixeira() {
  var pastas = _pastasNotas();
  var out = [];
  var agora = new Date().getTime();
  var limite = DIAS_LIXEIRA * 24 * 60 * 60 * 1000;
  var it = pastas.html.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed()) continue;
    var meta = {};
    try { meta = JSON.parse(f.getDescription() || '{}'); } catch (e) {}
    if (!meta.lixeiraEm) continue;
    // Purga automática: expirou os 7 dias → apaga de verdade
    var deletadoEm = new Date(meta.lixeiraEm).getTime();
    if (agora - deletadoEm > limite) {
      try { f.setTrashed(true); } catch (e) {}
      continue;
    }
    var diasRestantes = Math.ceil((limite - (agora - deletadoEm)) / (24 * 60 * 60 * 1000));
    out.push({
      id: f.getId(),
      titulo: String(f.getName()).replace(/^\[LIXEIRA\] /, '').replace(/\.html?$/i, ''),
      tipo: String(meta.tipo || '-'),
      entidade: String(meta.entidade || '-'),
      numero: String(meta.numero || ''),
      autor: String(meta.autor || '-'),
      excluidoEm: _fmtData(new Date(meta.lixeiraEm)),
      diasRestantes: diasRestantes,
      _ts: deletadoEm
    });
  }
  out.sort(function(a, b) { return b._ts - a._ts; });
  for (var i = 0; i < out.length; i++) delete out[i]._ts;
  return out;
}
