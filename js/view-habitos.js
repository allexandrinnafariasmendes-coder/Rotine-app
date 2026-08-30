/* Tela "Hábitos": marcação diária, sequência e meta semanal. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var EMOJIS = ['✦', '💧', '🏃', '📖', '🧘', '🌙', '🥗', '💊', '✍️', '🎸', '🧹', '☎️'];

  function formulario(store, habito) {
    var novo = !habito;
    var valores = habito || { titulo: '', emoji: '✦', meta: 7 };

    ui.abrirFormulario({
      titulo: novo ? 'Novo hábito' : 'Editar hábito',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'Hábito', tipo: 'texto', obrigatorio: true, dica: 'Ex.: beber 2L de água' },
        { nome: 'emoji', rotulo: 'Ícone', tipo: 'selecao', junto: true,
          opcoes: EMOJIS.map(function (e) { return { valor: e, rotulo: e }; }) },
        { nome: 'meta', rotulo: 'Meta por semana', tipo: 'numero', min: 1, max: 7, junto: true,
          ajuda: 'Quantos dias por semana você quer cumprir' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) {
          s.habitos = s.habitos.filter(function (h) { return h.id !== habito.id; });
        });
        ui.toast('Hábito excluído');
        App.render();
      },
      aoSalvar: function (v) {
        var meta = Math.min(7, Math.max(1, v.meta || 7));
        store.commit(function (s) {
          if (novo) s.habitos.push({ id: u.id(), titulo: v.titulo, emoji: v.emoji, meta: meta, criadoEm: u.hoje() });
          else Object.assign(habito, { titulo: v.titulo, emoji: v.emoji, meta: meta });
        });
        ui.toast(novo ? 'Hábito criado' : 'Hábito atualizado');
        App.render();
      }
    });
  }

  function cartao(store, habito) {
    var dias = u.ultimosDias(7);
    var hoje = u.hoje();
    var feitosNaSemana = dias.filter(function (d) { return store.feito('habitos', habito.id, d); }).length;
    var seq = store.sequencia(habito.id);

    var semana = el('div.habit__week', {}, dias.map(function (d) {
      var marcado = store.feito('habitos', habito.id, d);
      var classes = 'button.habit__cell' + (marcado ? '.is-done' : '') + (d === hoje ? '.is-today' : '');
      return el('div.habit__day', {}, [
        el(classes, {
          type: 'button',
          'aria-label': habito.titulo + ' em ' + u.dataCurta(d) + (marcado ? ' (feito)' : ''),
          'aria-pressed': marcado ? 'true' : 'false',
          onclick: function () { store.alternar('habitos', habito.id, d); App.render(); }
        }),
        el('span', { text: u.DIAS_MINI[u.diaDaSemana(d)] })
      ]);
    }));

    return el('div.habit', {}, [
      el('div.habit__head', { style: 'cursor:pointer', onclick: function () { formulario(store, habito); } }, [
        el('span.habit__emoji', { text: habito.emoji }),
        el('div', {}, [
          el('div.item__title', { text: habito.titulo }),
          el('div.item__meta', {}, [
            el('span', { text: feitosNaSemana + '/' + habito.meta + ' nos últimos 7 dias' })
          ])
        ])
      ]),
      el('div', { style: 'display:flex;align-items:center' }, [
        feitosNaSemana >= habito.meta
          ? el('span.chip.chip--ok', { text: 'meta ok' })
          : el('span.chip', { text: 'faltam ' + (habito.meta - feitosNaSemana) }),
        seq > 1 ? el('span.chip.chip--brand', { style: 'margin-left:6px', text: '🔥 ' + seq }) : null
      ].filter(Boolean)),
      semana
    ]);
  }

  App.views = App.views || {};
  App.views.habitos = {
    titulo: 'Hábitos',
    render: function (store) {
      var habitos = store.estado.habitos;
      return el('div', {}, [
        el('p.tiny.muted', { style: 'margin:6px 2px 12px',
          text: 'Toque nos quadradinhos para marcar qualquer dia da última semana.' }),
        el('button.btn.btn--primary.btn--block', {
          type: 'button', text: '+ Novo hábito',
          onclick: function () { formulario(store, null); }
        }),
        el('div.section-head', {}, [
          el('h2', { text: 'Meus hábitos' }),
          el('span', { text: u.plural(habitos.length, 'hábito', 'hábitos') })
        ]),
        habitos.length
          ? el('div.stack', {}, habitos.map(function (h) { return cartao(store, h); }))
          : ui.vazio('Nenhum hábito ainda', 'Comece com dois ou três — é mais fácil manter.')
      ]);
    }
  };
})();
