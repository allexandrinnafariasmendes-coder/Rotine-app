/* Estado do aplicativo: tudo fica no localStorage do próprio aparelho. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util;

  var CHAVE = 'minha-rotina:v1';
  var VERSAO = 1;

  var CATEGORIAS = {
    saude:    { nome: 'Saúde',    cor: '#17b890', emoji: '🌿' },
    trabalho: { nome: 'Trabalho', cor: '#6c5ce7', emoji: '💼' },
    estudo:   { nome: 'Estudo',   cor: '#3f8cff', emoji: '📚' },
    casa:     { nome: 'Casa',     cor: '#e8a33d', emoji: '🏠' },
    lazer:    { nome: 'Lazer',    cor: '#e05eb0', emoji: '🎧' },
    pessoal:  { nome: 'Pessoal',  cor: '#8a8fa8', emoji: '✨' }
  };

  var ouvintes = [];
  var estado = null;

  function estadoInicial() {
    return {
      versao: VERSAO,
      ajustes: { nome: '', tema: 'auto', semeado: false },
      blocos: [],
      habitos: [],
      tarefas: [],
      registro: {}   /* { 'AAAA-MM-DD': { blocos: {id:true}, habitos: {id:true} } } */
    };
  }

  function exemplo() {
    var semana = [1, 2, 3, 4, 5];
    var todos = [0, 1, 2, 3, 4, 5, 6];
    return {
      blocos: [
        { id: u.id(), titulo: 'Acordar e beber água', hora: '07:00', duracao: 10, dias: todos, categoria: 'saude', nota: '' },
        { id: u.id(), titulo: 'Alongamento e caminhada', hora: '07:20', duracao: 30, dias: semana, categoria: 'saude', nota: '' },
        { id: u.id(), titulo: 'Café da manhã sem celular', hora: '08:00', duracao: 30, dias: todos, categoria: 'pessoal', nota: '' },
        { id: u.id(), titulo: 'Bloco de foco principal', hora: '09:00', duracao: 120, dias: semana, categoria: 'trabalho', nota: 'A tarefa mais importante do dia primeiro.' },
        { id: u.id(), titulo: 'Almoço e pausa', hora: '12:30', duracao: 60, dias: semana, categoria: 'pessoal', nota: '' },
        { id: u.id(), titulo: 'Estudo / leitura', hora: '19:00', duracao: 45, dias: [1, 3, 5], categoria: 'estudo', nota: '' },
        { id: u.id(), titulo: 'Arrumar a casa', hora: '20:00', duracao: 20, dias: todos, categoria: 'casa', nota: '' },
        { id: u.id(), titulo: 'Desligar telas', hora: '22:30', duracao: 0, dias: todos, categoria: 'saude', nota: 'Celular longe da cama.' }
      ],
      habitos: [
        { id: u.id(), titulo: 'Beber 2L de água', emoji: '💧', meta: 7, criadoEm: u.hoje() },
        { id: u.id(), titulo: 'Exercício', emoji: '🏃', meta: 4, criadoEm: u.hoje() },
        { id: u.id(), titulo: 'Ler 10 páginas', emoji: '📖', meta: 5, criadoEm: u.hoje() },
        { id: u.id(), titulo: 'Dormir antes das 23h', emoji: '🌙', meta: 6, criadoEm: u.hoje() }
      ],
      tarefas: [
        { id: u.id(), titulo: 'Explorar o app e ajustar a rotina', data: u.hoje(), feita: false, prioridade: false, criadaEm: u.hoje() }
      ]
    };
  }

  /* ------------------------------------------------ persistência */

  function carregar() {
    var bruto = null;
    try { bruto = localStorage.getItem(CHAVE); } catch (e) { bruto = null; }

    if (!bruto) {
      estado = estadoInicial();
      return;
    }
    try {
      estado = normalizar(JSON.parse(bruto));
    } catch (e) {
      estado = estadoInicial();
    }
  }

  /* Preenche campos ausentes para que dados antigos ou importados
     nunca quebrem a renderização. */
  function normalizar(dados) {
    var base = estadoInicial();
    if (!dados || typeof dados !== 'object') return base;

    base.versao = VERSAO;
    base.ajustes = Object.assign(base.ajustes, dados.ajustes || {});
    base.registro = dados.registro && typeof dados.registro === 'object' ? dados.registro : {};

    base.blocos = (dados.blocos || []).map(function (b) {
      return {
        id: b.id || u.id(),
        titulo: String(b.titulo || 'Sem título'),
        hora: b.hora || '',
        duracao: Number(b.duracao) || 0,
        dias: Array.isArray(b.dias) && b.dias.length ? b.dias.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        categoria: CATEGORIAS[b.categoria] ? b.categoria : 'pessoal',
        nota: b.nota || ''
      };
    });

    base.habitos = (dados.habitos || []).map(function (h) {
      return {
        id: h.id || u.id(),
        titulo: String(h.titulo || 'Sem título'),
        emoji: h.emoji || '✦',
        meta: Math.min(7, Math.max(1, Number(h.meta) || 7)),
        criadoEm: h.criadoEm || u.hoje()
      };
    });

    base.tarefas = (dados.tarefas || []).map(function (t) {
      return {
        id: t.id || u.id(),
        titulo: String(t.titulo || 'Sem título'),
        data: t.data || null,
        feita: !!t.feita,
        prioridade: !!t.prioridade,
        criadaEm: t.criadaEm || u.hoje()
      };
    });

    return base;
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (e) {
      /* Modo privado ou armazenamento cheio: avisa em vez de falhar em silêncio. */
      if (App.ui && App.ui.toast) App.ui.toast('Não consegui salvar neste navegador');
      return false;
    }
  }

  function notificar() { ouvintes.forEach(function (fn) { fn(estado); }); }

  /* Aplica uma mudança, persiste e avisa a interface. */
  function commit(fn) {
    fn(estado);
    salvar();
    notificar();
  }

  /* --------------------------------------------------- registro */

  function diaRegistro(iso) {
    if (!estado.registro[iso]) estado.registro[iso] = { blocos: {}, habitos: {} };
    var d = estado.registro[iso];
    if (!d.blocos) d.blocos = {};
    if (!d.habitos) d.habitos = {};
    return d;
  }

  function feito(tipo, itemId, iso) {
    var d = estado.registro[iso];
    return !!(d && d[tipo] && d[tipo][itemId]);
  }

  function alternar(tipo, itemId, iso) {
    commit(function () {
      var d = diaRegistro(iso);
      if (d[tipo][itemId]) delete d[tipo][itemId];
      else d[tipo][itemId] = true;
    });
  }

  /* ----------------------------------------------------- listas */

  function blocosDoDia(iso) {
    var dow = u.diaDaSemana(iso);
    return estado.blocos
      .filter(function (b) { return b.dias.indexOf(dow) !== -1; })
      .sort(function (a, b) {
        var ma = u.minutosDe(a.hora), mb = u.minutosDe(b.hora);
        if (ma === null && mb === null) return a.titulo.localeCompare(b.titulo, 'pt-BR');
        if (ma === null) return 1;
        if (mb === null) return -1;
        return ma - mb;
      });
  }

  function progressoDoDia(iso) {
    var blocos = blocosDoDia(iso);
    var habitos = estado.habitos;
    var total = blocos.length + habitos.length;
    var concluidos = 0;

    blocos.forEach(function (b) { if (feito('blocos', b.id, iso)) concluidos++; });
    habitos.forEach(function (h) { if (feito('habitos', h.id, iso)) concluidos++; });

    return { total: total, concluidos: concluidos, pct: u.pct(concluidos, total) };
  }

  /* Sequência de dias seguidos com o hábito marcado.
     O dia de hoje ainda em aberto não quebra a sequência. */
  function sequencia(habitoId) {
    var dia = u.hoje();
    var n = 0;
    if (!feito('habitos', habitoId, dia)) dia = u.somarDias(dia, -1);
    while (feito('habitos', habitoId, dia)) {
      n++;
      dia = u.somarDias(dia, -1);
    }
    return n;
  }

  function tarefasDe(iso) {
    return estado.tarefas.filter(function (t) { return t.data === iso; });
  }

  /* Pendências de dias anteriores que continuam abertas. */
  function tarefasAtrasadas() {
    var h = u.hoje();
    return estado.tarefas.filter(function (t) {
      return !t.feita && t.data && t.data < h;
    });
  }

  /* ---------------------------------------------------- exportar */

  function exportar() { return JSON.stringify(estado, null, 2); }

  function importar(texto) {
    var dados = JSON.parse(texto);
    estado = normalizar(dados);
    salvar();
    notificar();
  }

  function limpar(manterRotina) {
    var blocos = estado.blocos, habitos = estado.habitos;
    estado = estadoInicial();
    estado.ajustes.semeado = true;
    if (manterRotina) {
      estado.blocos = blocos;
      estado.habitos = habitos;
    }
    salvar();
    notificar();
  }

  function semear() {
    var ex = exemplo();
    commit(function (s) {
      s.blocos = ex.blocos;
      s.habitos = ex.habitos;
      s.tarefas = ex.tarefas;
      s.ajustes.semeado = true;
    });
  }

  App.store = {
    CATEGORIAS: CATEGORIAS,
    iniciar: function () {
      carregar();
      /* Primeira abertura: começa com uma rotina de exemplo editável. */
      if (!estado.ajustes.semeado && !estado.blocos.length && !estado.habitos.length) {
        var ex = exemplo();
        estado.blocos = ex.blocos;
        estado.habitos = ex.habitos;
        estado.tarefas = ex.tarefas;
        estado.ajustes.semeado = true;
        salvar();
      }
    },
    get estado() { return estado; },
    subscrever: function (fn) { ouvintes.push(fn); },
    commit: commit,
    feito: feito,
    alternar: alternar,
    blocosDoDia: blocosDoDia,
    progressoDoDia: progressoDoDia,
    sequencia: sequencia,
    tarefasDe: tarefasDe,
    tarefasAtrasadas: tarefasAtrasadas,
    exportar: exportar,
    importar: importar,
    limpar: limpar,
    semear: semear
  };
})();
