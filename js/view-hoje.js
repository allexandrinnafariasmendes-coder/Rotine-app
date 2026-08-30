/* Tela "Hoje": o dia em andamento — rotina, hábitos e tarefas. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var dia = null;   /* dia visível; permite revisar ontem sem perder o registro */

  var PERIODOS = [
    { chave: 'manha', rotulo: 'Manhã' },
    { chave: 'tarde', rotulo: 'Tarde' },
    { chave: 'noite', rotulo: 'Noite' },
    { chave: 'flex', rotulo: 'Sem horário' }
  ];

  function saudacao() {
    var h = new Date().getHours();
    if (h < 5) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  function frase(prog) {
    if (!prog.total) return 'Nada programado ainda. Monte sua rotina na aba Rotina.';
    if (prog.pct === 100) return 'Dia completo. Aproveite o descanso. 🎉';
    if (prog.pct >= 60) return 'Bom ritmo — faltam ' + (prog.total - prog.concluidos) + ' itens.';
    if (prog.concluidos === 0) return 'Comece pelo primeiro item da lista.';
    return 'Você já concluiu ' + prog.concluidos + ' de ' + prog.total + '.';
  }

  function cabecalho(store) {
    var prog = store.progressoDoDia(dia);
    var ehHoje = dia === u.hoje();
    var nome = store.estado.ajustes.nome;

    var hero = el('div.hero', {}, [
      el('div.hero__text', {}, [
        el('div.hero__hi', { text: ehHoje ? saudacao() + (nome ? ', ' + nome : '') + '!' : u.dataRelativa(dia) }),
        el('div.hero__date', { text: u.dataLonga(dia) }),
        el('div.hero__note', { text: frase(prog) })
      ]),
      ui.anel(prog.pct)
    ]);

    var navegacao = el('div.row', { style: 'margin:12px 2px 0;align-items:center' }, [
      el('button.btn.btn--sm.btn--ghost', {
        type: 'button', text: '‹ ' + u.dataCurta(u.somarDias(dia, -1)),
        onclick: function () { dia = u.somarDias(dia, -1); App.render(); }
      }),
      !ehHoje ? el('button.btn.btn--sm', {
        type: 'button', text: 'Voltar para hoje',
        onclick: function () { dia = u.hoje(); App.render(); }
      }) : null,
      el('button.btn.btn--sm.btn--ghost', {
        type: 'button', text: u.dataCurta(u.somarDias(dia, 1)) + ' ›',
        onclick: function () { dia = u.somarDias(dia, 1); App.render(); }
      })
    ]);

    return el('div', {}, [hero, navegacao]);
  }

  function linhaBloco(store, bloco) {
    var cat = store.CATEGORIAS[bloco.categoria];
    var marcado = store.feito('blocos', bloco.id, dia);

    var meta = [el('span', {}, [
      el('span.dot', { style: 'background:' + cat.cor + ';display:inline-block;margin-right:6px' }),
      cat.nome
    ])];
    if (bloco.duracao) meta.push(el('span', { text: u.duracaoTexto(bloco.duracao) }));
    if (bloco.nota) meta.push(el('span', { text: bloco.nota }));

    return ui.itemMarcavel({
      titulo: bloco.titulo,
      hora: bloco.hora || '—',
      feito: marcado,
      meta: meta,
      aoMarcar: function () { store.alternar('blocos', bloco.id, dia); App.render(); }
    });
  }

  function secaoRotina(store) {
    var blocos = store.blocosDoDia(dia);
    var out = [el('div.section-head', {}, [
      el('h2', { text: 'Rotina do dia' }),
      el('span', { text: u.plural(blocos.length, 'atividade', 'atividades') })
    ])];

    if (!blocos.length) {
      out.push(ui.vazio('Nenhuma atividade neste dia', 'Adicione atividades na aba Rotina.'));
      return out;
    }

    PERIODOS.forEach(function (p) {
      var doPeriodo = blocos.filter(function (b) { return u.periodoDe(b.hora) === p.chave; });
      if (!doPeriodo.length) return;
      out.push(el('div.tiny.muted', { style: 'margin:14px 2px 6px;font-weight:700', text: p.rotulo }));
      out.push(el('div.stack.stack--tight', {}, doPeriodo.map(function (b) { return linhaBloco(store, b); })));
    });

    return out;
  }

  function secaoHabitos(store) {
    var habitos = store.estado.habitos;
    if (!habitos.length) return [];

    var feitos = habitos.filter(function (h) { return store.feito('habitos', h.id, dia); }).length;

    return [
      el('div.section-head', {}, [
        el('h2', { text: 'Hábitos' }),
        el('span', { text: feitos + '/' + habitos.length })
      ]),
      el('div.stack.stack--tight', {}, habitos.map(function (h) {
        var seq = store.sequencia(h.id);
        return ui.itemMarcavel({
          titulo: h.emoji + '  ' + h.titulo,
          feito: store.feito('habitos', h.id, dia),
          meta: seq > 1 ? [el('span.chip.chip--brand', { text: '🔥 ' + seq + ' dias seguidos' })] : null,
          aoMarcar: function () { store.alternar('habitos', h.id, dia); App.render(); }
        });
      }))
    ];
  }

  function secaoTarefas(store) {
    var tarefas = store.tarefasDe(dia);
    var atrasadas = dia === u.hoje() ? store.tarefasAtrasadas() : [];
    if (!tarefas.length && !atrasadas.length) return [];

    function linha(t, atrasada) {
      return ui.itemMarcavel({
        titulo: t.titulo,
        feito: t.feita,
        meta: [
          atrasada ? el('span.chip.chip--warn', { text: 'atrasada · ' + u.dataCurta(t.data) }) : null,
          t.prioridade ? el('span.chip', { text: '★ prioridade' }) : null
        ].filter(Boolean),
        aoMarcar: function () {
          store.commit(function () { t.feita = !t.feita; });
          App.render();
        }
      });
    }

    return [
      el('div.section-head', {}, [
        el('h2', { text: 'Tarefas' }),
        el('span', { text: u.plural(tarefas.length + atrasadas.length, 'item', 'itens') })
      ]),
      el('div.stack.stack--tight', {},
        atrasadas.map(function (t) { return linha(t, true); })
          .concat(tarefas.map(function (t) { return linha(t, false); })))
    ];
  }

  App.views = App.views || {};
  App.views.hoje = {
    titulo: 'Hoje',
    render: function (store) {
      if (!dia) dia = u.hoje();
      var filhos = [cabecalho(store)]
        .concat(secaoRotina(store))
        .concat(secaoHabitos(store))
        .concat(secaoTarefas(store));
      return el('div', {}, filhos);
    }
  };
})();
