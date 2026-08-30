/* Tela "Progresso": como a rotina se comportou nos últimos dias. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var JANELA = 7;   /* dias mostrados no gráfico */

  function media(store, dias) {
    var comItens = dias.map(function (d) { return store.progressoDoDia(d); })
      .filter(function (p) { return p.total > 0; });
    if (!comItens.length) return 0;
    var soma = comItens.reduce(function (acc, p) { return acc + p.pct; }, 0);
    return Math.round(soma / comItens.length);
  }

  function melhorSequencia(store) {
    return store.estado.habitos.reduce(function (max, h) {
      return Math.max(max, store.sequencia(h.id));
    }, 0);
  }

  function grafico(store, dias) {
    return el('div.card', {}, [
      el('div.bars', {}, dias.map(function (d) {
        var p = store.progressoDoDia(d);
        var altura = p.total ? Math.max(6, Math.round(p.pct * 0.92)) : 4;
        return el('div.bars__col', {}, [
          el('span.bars__pct', { text: p.total ? p.pct + '%' : '–' }),
          el('div' + (p.total ? '.bars__bar' : '.bars__bar.bars__bar--empty'), {
            style: 'height:' + altura + '%',
            title: u.dataCurta(d) + ': ' + p.concluidos + '/' + p.total
          }),
          el('span.bars__day', { text: u.DIAS_MINI[u.diaDaSemana(d)] })
        ]);
      }))
    ]);
  }

  function resumoHabitos(store) {
    var habitos = store.estado.habitos;
    if (!habitos.length) return [];

    var ultimos30 = u.ultimosDias(30);

    return [
      el('div.section-head', {}, [
        el('h2', { text: 'Hábitos nos últimos 30 dias' })
      ]),
      el('div.stack.stack--tight', {}, habitos.map(function (h) {
        var n = ultimos30.filter(function (d) { return store.feito('habitos', h.id, d); }).length;
        var seq = store.sequencia(h.id);
        return el('div.item', {}, [
          el('span.habit__emoji', { text: h.emoji }),
          el('div.item__body', {}, [
            el('div.item__title', { text: h.titulo }),
            el('div.item__meta', {}, [
              el('span', { text: u.plural(n, 'dia marcado', 'dias marcados') }),
              el('span', { text: u.pct(n, 30) + '% do mês' })
            ])
          ]),
          seq > 0 ? el('span.chip.chip--brand', { text: '🔥 ' + seq }) : null
        ]);
      }))
    ];
  }

  function resumoCategorias(store) {
    var dias = u.ultimosDias(JANELA);
    var acumulado = {};

    dias.forEach(function (d) {
      store.blocosDoDia(d).forEach(function (b) {
        var c = acumulado[b.categoria] || (acumulado[b.categoria] = { total: 0, feitos: 0 });
        c.total++;
        if (store.feito('blocos', b.id, d)) c.feitos++;
      });
    });

    var chaves = Object.keys(acumulado);
    if (!chaves.length) return [];

    return [
      el('div.section-head', {}, [el('h2', { text: 'Por categoria (7 dias)' })]),
      el('div.stack.stack--tight', {}, chaves
        .sort(function (a, b) { return acumulado[b].total - acumulado[a].total; })
        .map(function (k) {
          var cat = store.CATEGORIAS[k], c = acumulado[k];
          return el('div.item', {}, [
            el('span.dot', { style: 'background:' + cat.cor + ';width:10px;height:10px' }),
            el('div.item__body', {}, [
              el('div.item__title', { text: cat.nome }),
              el('div.item__meta', {}, [
                el('span', { text: c.feitos + ' de ' + c.total + ' concluídas' })
              ])
            ]),
            el('span.chip' + (u.pct(c.feitos, c.total) >= 70 ? '.chip--ok' : ''), {
              text: u.pct(c.feitos, c.total) + '%'
            })
          ]);
        }))
    ];
  }

  App.views = App.views || {};
  App.views.progresso = {
    titulo: 'Progresso',
    render: function (store) {
      var dias = u.ultimosDias(JANELA);
      var completos = dias.filter(function (d) {
        var p = store.progressoDoDia(d);
        return p.total > 0 && p.pct === 100;
      }).length;
      var tarefasFeitas = store.estado.tarefas.filter(function (t) { return t.feita; }).length;

      var filhos = [
        el('div.stats', {}, [
          el('div.stat', {}, [
            el('div.stat__value', { text: media(store, dias) + '%' }),
            el('div.stat__label', { text: 'média 7 dias' })
          ]),
          el('div.stat', {}, [
            el('div.stat__value', { text: String(completos) }),
            el('div.stat__label', { text: 'dias completos' })
          ]),
          el('div.stat', {}, [
            el('div.stat__value', { text: String(melhorSequencia(store)) }),
            el('div.stat__label', { text: 'maior sequência' })
          ])
        ]),
        el('div.section-head', {}, [
          el('h2', { text: 'Últimos 7 dias' }),
          el('span', { text: 'conclusão do dia' })
        ]),
        grafico(store, dias)
      ]
        .concat(resumoCategorias(store))
        .concat(resumoHabitos(store));

      filhos.push(el('p.tiny.muted', { style: 'margin:18px 2px 0',
        text: 'Total de tarefas concluídas desde o começo: ' + tarefasFeitas + '.' }));

      return el('div', {}, filhos);
    }
  };
})();
