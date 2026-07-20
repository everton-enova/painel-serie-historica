/**
 * PAINEL SÉRIE HISTÓRICA — SABE / SAEB
 * Backend Apps Script (arquivo único)
 *
 * Fonte SABE: aba "SABE 19 a 25" (formato longo, coluna TIPO define o nível):
 *   TIPO = ESCOLA | MUNICIPIO | REGIONAL | ESTADO
 * Fonte Saeb: abas "Saeb 23" + "Saeb 25" (escola), "Saeb_MUN" + "Saeb_MUN_25"
 *   (município) e "Saeb_BAHIA" (estado) — formato largo (IRyy/MATyy/LPyy/MPyy/IDEByy).
 * Login: aba "Colaboradores" (NOME_COLABORADOR | CPF).
 *
 * Implantar como App da Web (Executar como: Eu / Acesso: Qualquer pessoa).
 */

// ══════════════════ CONFIGURAÇÃO ══════════════════

var ABA_SABE = 'SABE 19 a 25';
var ABA_COLABORADORES = 'Colaboradores';
var ABAS_SAEB_ESCOLA = ['Saeb 23', 'Saeb 25'];
var ABAS_SAEB_MUNICIPIO = ['Saeb_MUN', 'Saeb_MUN_25'];
var ABA_SAEB_BAHIA = 'Saeb_BAHIA';

// Edições SABE marcadas como preliminares no painel.
// Quando os resultados forem finalizados, deixe o array vazio: []
var EDICOES_PRELIMINARES = [2025];

// ══════════════════ API JSON (Next.js) ══════════════════
// Mantida para o painel Vercel (GOOGLE_APPS_SCRIPT_URL no .env.local)

function doGet(e) {
  try {
    var sheetNames = (e.parameter.sheets || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (sheetNames.length === 0) return jsonResponse({ erro: 'Nenhuma aba solicitada.' });
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

// Junta blocos de várias abas (ex.: Saeb 23 + Saeb 25) por etapa|rede.
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
