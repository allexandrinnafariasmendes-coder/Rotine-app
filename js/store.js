/* Estado do aplicativo. Tudo fica no localStorage do próprio aparelho. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util;

  var CHAVE = 'minha-rotina:v2';
  var CHAVE_ANTIGA = 'minha-rotina:v1';
  var VERSAO = 2;

  /* Áreas da vida — usadas em toda a interface (cor, ícone e agrupamento). */
  var AREAS = {
    sono:        { nome: 'Sono',         emoji: '😴', cor: '#8E9BC4', grupo: 'recuperar' },
    escola:      { nome: 'Escola',       emoji: '🎒', cor: '#8FB0C7', grupo: 'obrigacao' },
    estudo:      { nome: 'Estudo',       emoji: '📚', cor: '#7FA3B8', grupo: 'obrigacao' },
    exercicio:   { nome: 'Exercício',    emoji: '🏃', cor: '#8FA98A', grupo: 'corpo' },
    compromisso: { nome: 'Compromisso',  emoji: '📅', cor: '#C0A0B4', grupo: 'obrigacao' },
    autocuidado: { nome: 'Autocuidado',  emoji: '✨', cor: '#E0A9A9', grupo: 'corpo' },
    alimentacao: { nome: 'Alimentação',  emoji: '🍽️', cor: '#D9B48F', grupo: 'corpo' },
    descanso:    { nome: 'Descanso',     emoji: '🌿', cor: '#A8B5A2', grupo: 'recuperar' },
    hobby:       { nome: 'Hobby',        emoji: '🎨', cor: '#C7B7DC', grupo: 'recuperar' },
    casa:        { nome: 'Casa',         emoji: '🏡', cor: '#C9B79C', grupo: 'obrigacao' },
    espiritual:  { nome: 'Espiritual',   emoji: '🕊️', cor: '#B6C6D8', grupo: 'alma' },
    pessoal:     { nome: 'Pessoal',      emoji: '💛', cor: '#D9C08C', grupo: 'recuperar' }
  };

  /* Áreas que contam como recuperação — o app cobra a presença delas no dia. */
  var AREAS_DESCANSO = ['descanso', 'hobby', 'sono', 'pessoal'];

  var AREAS_OBJETIVO = {
    estudos: { nome: 'Estudos', emoji: '📚' },
    futuro:  { nome: 'Futuro', emoji: '🩺' },
    eu:      { nome: 'Eu', emoji: '💆‍♀️' },
    casa:    { nome: 'Casa', emoji: '🏡' },
    vida:    { nome: 'Vida pessoal', emoji: '❤️' }
  };

  var ouvintes = [];
  var estado = null;

  function estadoInicial() {
    return {
      versao: VERSAO,
      ajustes: {
        nome: '',
        tema: 'auto',
        semeado: false,
        acordar: '06:30',
        dormir: '22:30',
        secoes: { estudos: true, autocuidado: true, espiritual: true, objetivos: true }
      },
      blocos: [],      /* rotina recorrente */
      eventos: [],     /* compromissos de um dia específico */
      tarefas: [],
      objetivos: [],
      disciplinas: [],
      sessoes: [],     /* sessões de estudo registradas */
      rituais: [],     /* conjuntos de hábitos contextualizados */
      cuidados: [],    /* autocuidado recorrente */
      espiritual: { praticas: [], intencoes: [], diario: [] },
      registro: {},    /* marcações por dia */
      semanas: {},     /* reflexão semanal */
      sessaoAtiva: null
    };
  }

  /* ------------------------------------------------------ seed */

  function exemplo() {
    var todos = [0, 1, 2, 3, 4, 5, 6];
    var semana = [1, 2, 3, 4, 5];
    var h = u.hoje();

    var bio = u.id(), mat = u.id();
    var tMendel = u.id(), tHeredo = u.id(), tProb = u.id(), tAfim = u.id(), tQuad = u.id();

    return {
      blocos: [
        { id: u.id(), titulo: 'Acordar', hora: '06:30', duracao: 15, dias: todos, area: 'sono', fixo: true, nota: '' },
        { id: u.id(), titulo: 'Café da manhã', hora: '07:00', duracao: 30, dias: todos, area: 'alimentacao', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Estudo', hora: '07:30', duracao: 90, dias: semana, area: 'estudo', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Almoço', hora: '13:30', duracao: 30, dias: todos, area: 'alimentacao', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Descanso', hora: '14:00', duracao: 60, dias: todos, area: 'descanso', fixo: false, nota: 'Sem culpa. Descansar também é parte do dia.' },
        { id: u.id(), titulo: 'Estudo', hora: '15:00', duracao: 90, dias: semana, area: 'estudo', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Preparar-se', hora: '16:30', duracao: 45, dias: semana, area: 'pessoal', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Jantar', hora: '19:30', duracao: 30, dias: todos, area: 'alimentacao', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Revisão do dia', hora: '20:00', duracao: 15, dias: todos, area: 'pessoal', fixo: false, nota: '' },
        { id: u.id(), titulo: 'Dormir', hora: '22:30', duracao: 0, dias: todos, area: 'sono', fixo: true, nota: '' }
      ],
      eventos: [],
      rituais: [
        { id: u.id(), titulo: 'Rotina da manhã', periodo: 'manha', hora: '06:45', dias: todos, itens: [
          { id: u.id(), titulo: 'Beber água' },
          { id: u.id(), titulo: 'Higiene' },
          { id: u.id(), titulo: 'Skincare' },
          { id: u.id(), titulo: 'Arrumar a cama' }
        ] },
        { id: u.id(), titulo: 'Rotina noturna', periodo: 'noite', hora: '21:30', dias: todos, itens: [
          { id: u.id(), titulo: 'Guardar o celular' },
          { id: u.id(), titulo: 'Higiene' },
          { id: u.id(), titulo: 'Skincare' },
          { id: u.id(), titulo: 'Preparar as coisas de amanhã' },
          { id: u.id(), titulo: 'Revisar o dia' }
        ] }
      ],
      cuidados: [
        { id: u.id(), titulo: 'Skincare da manhã', categoria: 'pele', intervalo: 1, ultimaVez: null },
        { id: u.id(), titulo: 'Skincare da noite', categoria: 'pele', intervalo: 1, ultimaVez: null },
        { id: u.id(), titulo: 'Cuidar do cabelo', categoria: 'cabelo', intervalo: 3, ultimaVez: null },
        { id: u.id(), titulo: 'Hidratação capilar', categoria: 'cabelo', intervalo: 7, ultimaVez: null },
        { id: u.id(), titulo: 'Organizar os produtos', categoria: 'organizacao', intervalo: 30, ultimaVez: null },
        { id: u.id(), titulo: 'Manutenção das unhas', categoria: 'unhas', intervalo: 15, ultimaVez: null }
      ],
      objetivos: [
        { id: u.id(), titulo: 'Ir bem na prova de Biologia', area: 'estudos', prazo: u.somarDias(h, 7), nota: '',
          passos: [
            { id: u.id(), titulo: 'Revisar Leis de Mendel', feito: false },
            { id: u.id(), titulo: 'Resolver heredogramas', feito: false },
            { id: u.id(), titulo: 'Fazer exercícios de probabilidade', feito: false }
          ], arquivado: false },
        { id: u.id(), titulo: 'Deixar o quarto do jeito que eu gosto', area: 'casa', prazo: null, nota: '',
          passos: [
            { id: u.id(), titulo: 'Organizar a escrivaninha', feito: false },
            { id: u.id(), titulo: 'Separar roupas para doar', feito: false }
          ], arquivado: false },
        { id: u.id(), titulo: 'Cuidar melhor de mim', area: 'eu', prazo: null, nota: 'Sem pressa, no meu ritmo.',
          passos: [{ id: u.id(), titulo: 'Manter o skincare por duas semanas', feito: false }], arquivado: false }
      ],
      disciplinas: [
        { id: bio, nome: 'Biologia', emoji: '🧬', topicos: [
          { id: tMendel, nome: 'Leis de Mendel', assunto: 'Genética', status: 'estudando', ultimaRevisao: null, minutos: 0 },
          { id: tHeredo, nome: 'Heredogramas', assunto: 'Genética', status: 'nao', ultimaRevisao: null, minutos: 0 },
          { id: tProb, nome: 'Probabilidade', assunto: 'Genética', status: 'nao', ultimaRevisao: null, minutos: 0 }
        ] },
        { id: mat, nome: 'Matemática', emoji: '📐', topicos: [
          { id: tAfim, nome: 'Função afim', assunto: 'Funções', status: 'ok', ultimaRevisao: u.somarDias(h, -4), minutos: 50 },
          { id: tQuad, nome: 'Função quadrática', assunto: 'Funções', status: 'nao', ultimaRevisao: null, minutos: 0 }
        ] }
      ],
      sessoes: [],
      tarefas: [
        { id: u.id(), titulo: 'Explorar o app e deixar do meu jeito', data: h, feita: false, prioridade: 2, estimativa: 20, area: 'pessoal', objetivoId: null, criadaEm: h }
      ],
      espiritual: {
        praticas: [
          { id: u.id(), titulo: 'Oração da manhã', momento: 'manha' },
          { id: u.id(), titulo: 'Leitura espiritual', momento: 'tarde' },
          { id: u.id(), titulo: 'Exame de consciência', momento: 'noite' }
        ],
        intencoes: [],
        diario: []
      }
    };
  }

  /* ---------------------------------------------- persistência */

  function normalizar(d) {
    var base = estadoInicial();
    if (!d || typeof d !== 'object') return base;

    base.versao = VERSAO;
    base.ajustes = Object.assign(base.ajustes, d.ajustes || {});
    /* Temas da primeira versão usavam nomes em inglês. */
    var temas = { dark: 'escuro', light: 'claro', auto: 'auto', escuro: 'escuro', claro: 'claro' };
    base.ajustes.tema = temas[base.ajustes.tema] || 'auto';
    base.ajustes.secoes = Object.assign({ estudos: true, autocuidado: true, espiritual: true, objetivos: true },
      (d.ajustes && d.ajustes.secoes) || {});
    base.registro = d.registro && typeof d.registro === 'object' ? d.registro : {};
    base.semanas = d.semanas && typeof d.semanas === 'object' ? d.semanas : {};
    base.sessaoAtiva = d.sessaoAtiva || null;

    base.blocos = (d.blocos || []).map(function (b) {
      return {
        id: b.id || u.id(),
        titulo: String(b.titulo || 'Sem título'),
        hora: b.hora || '',
        duracao: Number(b.duracao) || 0,
        dias: Array.isArray(b.dias) && b.dias.length ? b.dias.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        area: AREAS[b.area] ? b.area : 'pessoal',
        fixo: !!b.fixo,
        nota: b.nota || ''
      };
    });

    base.eventos = (d.eventos || []).map(function (e) {
      return {
        id: e.id || u.id(),
        titulo: String(e.titulo || 'Sem título'),
        data: e.data || u.hoje(),
        hora: e.hora || '',
        duracao: Number(e.duracao) || 0,
        area: AREAS[e.area] ? e.area : 'compromisso',
        local: e.local || '',
        nota: e.nota || ''
      };
    });

    base.tarefas = (d.tarefas || []).map(function (t) {
      return {
        id: t.id || u.id(),
        titulo: String(t.titulo || 'Sem título'),
        data: t.data || null,
        feita: !!t.feita,
        prioridade: Math.min(3, Math.max(1, Number(t.prioridade) || (t.prioridade === true ? 3 : 2))),
        estimativa: Number(t.estimativa) || 30,
        area: AREAS[t.area] ? t.area : 'pessoal',
        objetivoId: t.objetivoId || null,
        criadaEm: t.criadaEm || u.hoje()
      };
    });

    base.objetivos = (d.objetivos || []).map(function (o) {
      return {
        id: o.id || u.id(),
        titulo: String(o.titulo || 'Sem título'),
        area: AREAS_OBJETIVO[o.area] ? o.area : 'vida',
        prazo: o.prazo || null,
        nota: o.nota || '',
        passos: (o.passos || []).map(function (p) {
          return { id: p.id || u.id(), titulo: String(p.titulo || ''), feito: !!p.feito };
        }),
        arquivado: !!o.arquivado
      };
    });

    base.disciplinas = (d.disciplinas || []).map(function (x) {
      return {
        id: x.id || u.id(),
        nome: String(x.nome || 'Disciplina'),
        emoji: x.emoji || '📘',
        topicos: (x.topicos || []).map(function (t) {
          return {
            id: t.id || u.id(),
            nome: String(t.nome || 'Conteúdo'),
            assunto: t.assunto || '',
            status: ['nao', 'estudando', 'ok'].indexOf(t.status) !== -1 ? t.status : 'nao',
            ultimaRevisao: t.ultimaRevisao || null,
            minutos: Number(t.minutos) || 0
          };
        })
      };
    });

    base.sessoes = (d.sessoes || []).map(function (s) {
      return {
        id: s.id || u.id(),
        data: s.data || u.hoje(),
        disciplinaId: s.disciplinaId || null,
        topicoId: s.topicoId || null,
        minutos: Number(s.minutos) || 0,
        nota: s.nota || ''
      };
    });

    base.rituais = (d.rituais || []).map(function (r) {
      return {
        id: r.id || u.id(),
        titulo: String(r.titulo || 'Ritual'),
        periodo: ['manha', 'tarde', 'noite', 'qualquer'].indexOf(r.periodo) !== -1 ? r.periodo : 'qualquer',
        hora: r.hora || '',
        dias: Array.isArray(r.dias) && r.dias.length ? r.dias.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        itens: (r.itens || []).map(function (i) {
          return { id: i.id || u.id(), titulo: String(i.titulo || '') };
        })
      };
    });

    base.cuidados = (d.cuidados || []).map(function (c) {
      return {
        id: c.id || u.id(),
        titulo: String(c.titulo || 'Cuidado'),
        categoria: c.categoria || 'pele',
        intervalo: Math.max(1, Number(c.intervalo) || 7),
        ultimaVez: c.ultimaVez || null
      };
    });

    var esp = d.espiritual || {};
    base.espiritual = {
      praticas: (esp.praticas || []).map(function (p) {
        return { id: p.id || u.id(), titulo: String(p.titulo || ''), momento: p.momento || 'qualquer' };
      }),
      intencoes: (esp.intencoes || []).map(function (i) {
        return { id: i.id || u.id(), texto: String(i.texto || ''), criadaEm: i.criadaEm || u.hoje(), atendida: !!i.atendida };
      }),
      diario: (esp.diario || []).map(function (e) {
        return { id: e.id || u.id(), data: e.data || u.hoje(), texto: String(e.texto || '') };
      })
    };

    return base;
  }

  /* Converte os dados da primeira versão do app, se existirem. */
  function migrarV1(antigo) {
    var mapaArea = { saude: 'autocuidado', trabalho: 'estudo', estudo: 'estudo', casa: 'casa', lazer: 'hobby', pessoal: 'pessoal' };
    var novo = estadoInicial();
    novo.ajustes.nome = (antigo.ajustes && antigo.ajustes.nome) || '';
    novo.ajustes.tema = { dark: 'escuro', light: 'claro' }[(antigo.ajustes || {}).tema] || 'auto';
    novo.ajustes.semeado = true;

    novo.blocos = (antigo.blocos || []).map(function (b) {
      return {
        id: b.id, titulo: b.titulo, hora: b.hora, duracao: b.duracao, dias: b.dias,
        area: mapaArea[b.categoria] || 'pessoal', fixo: false, nota: b.nota || ''
      };
    });

    /* Cada hábito antigo vira um item de um ritual único. */
    if ((antigo.habitos || []).length) {
      var ritual = { id: u.id(), titulo: 'Meus hábitos', periodo: 'qualquer', hora: '', dias: [0, 1, 2, 3, 4, 5, 6], itens: [] };
      var mapaItem = {};
      antigo.habitos.forEach(function (h) {
        var item = { id: u.id(), titulo: (h.emoji ? h.emoji + ' ' : '') + h.titulo };
        mapaItem[h.id] = item.id;
        ritual.itens.push(item);
      });
      novo.rituais = [ritual];
      Object.keys(antigo.registro || {}).forEach(function (dia) {
        var r = antigo.registro[dia] || {};
        novo.registro[dia] = { blocos: r.blocos || {}, eventos: {}, itens: {}, praticas: {}, cuidados: {} };
        Object.keys(r.habitos || {}).forEach(function (hid) {
          if (mapaItem[hid]) novo.registro[dia].itens[mapaItem[hid]] = true;
        });
      });
    } else {
      Object.keys(antigo.registro || {}).forEach(function (dia) {
        novo.registro[dia] = { blocos: (antigo.registro[dia] || {}).blocos || {}, eventos: {}, itens: {}, praticas: {}, cuidados: {} };
      });
    }

    novo.tarefas = (antigo.tarefas || []).map(function (t) {
      return {
        id: t.id, titulo: t.titulo, data: t.data, feita: !!t.feita,
        prioridade: t.prioridade ? 3 : 2, estimativa: 30, area: 'pessoal',
        objetivoId: null, criadaEm: t.criadaEm || u.hoje()
      };
    });

    return novo;
  }

  function carregar() {
    var bruto = null, antigo = null;
    try {
      bruto = localStorage.getItem(CHAVE);
      antigo = localStorage.getItem(CHAVE_ANTIGA);
    } catch (e) { /* armazenamento indisponível */ }

    if (bruto) {
      try { estado = normalizar(JSON.parse(bruto)); return; } catch (e) { /* segue adiante */ }
    }
    if (antigo) {
      try {
        estado = normalizar(migrarV1(JSON.parse(antigo)));
        salvar();
        return;
      } catch (e) { /* segue adiante */ }
    }
    estado = estadoInicial();
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (e) {
      if (App.ui && App.ui.aviso) App.ui.aviso('Não consegui salvar neste navegador');
      return false;
    }
  }

  function notificar() { ouvintes.forEach(function (fn) { fn(estado); }); }

  function commit(fn) {
    fn(estado);
    salvar();
    notificar();
  }

  /* ------------------------------------------------- registro */

  function dia(iso) {
    if (!estado.registro[iso]) estado.registro[iso] = {};
    var d = estado.registro[iso];
    ['blocos', 'eventos', 'itens', 'praticas', 'cuidados'].forEach(function (k) {
      if (!d[k]) d[k] = {};
    });
    return d;
  }

  function feito(balde, itemId, iso) {
    var d = estado.registro[iso];
    return !!(d && d[balde] && d[balde][itemId]);
  }

  function alternar(balde, itemId, iso) {
    commit(function () {
      var d = dia(iso);
      if (d[balde][itemId]) delete d[balde][itemId];
      else d[balde][itemId] = true;
    });
  }

  function revisao(iso) { return (estado.registro[iso] || {}).revisao || null; }

  function salvarRevisao(iso, dados) {
    commit(function () { dia(iso).revisao = dados; });
  }

  /* ------------------------------------------------ auxiliares */

  function objetivo(id) {
    return estado.objetivos.filter(function (o) { return o.id === id; })[0] || null;
  }

  function disciplinaDoTopico(topicoId) {
    var achou = null;
    estado.disciplinas.forEach(function (d) {
      d.topicos.forEach(function (t) { if (t.id === topicoId) achou = d; });
    });
    return achou;
  }

  function topico(topicoId) {
    var achou = null;
    estado.disciplinas.forEach(function (d) {
      d.topicos.forEach(function (t) { if (t.id === topicoId) achou = t; });
    });
    return achou;
  }

  /* Próxima data prevista de um cuidado recorrente. */
  function proximaVez(cuidado) {
    if (!cuidado.ultimaVez) return u.hoje();
    return u.somarDias(cuidado.ultimaVez, cuidado.intervalo);
  }

  function cuidadosDeHoje(iso) {
    var ref = iso || u.hoje();
    return estado.cuidados.filter(function (c) { return proximaVez(c) <= ref; });
  }

  /* -------------------------------------------------- exportar */

  function exportar() { return JSON.stringify(estado, null, 2); }

  function importar(texto) {
    estado = normalizar(JSON.parse(texto));
    salvar();
    notificar();
  }

  function semear() {
    var ex = exemplo();
    commit(function (s) {
      Object.keys(ex).forEach(function (k) { s[k] = ex[k]; });
      s.ajustes.semeado = true;
    });
  }

  function limpar(manterEstrutura) {
    var guardado = {
      blocos: estado.blocos, rituais: estado.rituais, cuidados: estado.cuidados,
      disciplinas: estado.disciplinas, objetivos: estado.objetivos, espiritual: estado.espiritual
    };
    var nome = estado.ajustes.nome, tema = estado.ajustes.tema;
    estado = estadoInicial();
    estado.ajustes.nome = nome;
    estado.ajustes.tema = tema;
    estado.ajustes.semeado = true;
    if (manterEstrutura) Object.keys(guardado).forEach(function (k) { estado[k] = guardado[k]; });
    salvar();
    notificar();
  }

  App.store = {
    AREAS: AREAS,
    AREAS_DESCANSO: AREAS_DESCANSO,
    AREAS_OBJETIVO: AREAS_OBJETIVO,
    iniciar: function () {
      carregar();
      if (!estado.ajustes.semeado && !estado.blocos.length) {
        var ex = exemplo();
        Object.keys(ex).forEach(function (k) { estado[k] = ex[k]; });
        estado.ajustes.semeado = true;
        salvar();
      }
    },
    get estado() { return estado; },
    subscrever: function (fn) { ouvintes.push(fn); },
    commit: commit,
    dia: dia,
    feito: feito,
    alternar: alternar,
    revisao: revisao,
    salvarRevisao: salvarRevisao,
    objetivo: objetivo,
    topico: topico,
    disciplinaDoTopico: disciplinaDoTopico,
    proximaVez: proximaVez,
    cuidadosDeHoje: cuidadosDeHoje,
    exportar: exportar,
    importar: importar,
    semear: semear,
    limpar: limpar
  };
})();
