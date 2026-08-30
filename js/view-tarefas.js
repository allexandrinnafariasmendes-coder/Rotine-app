/* Tela "Tarefas": lista de pendências com data opcional. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var mostrarFeitas = false;

  function formulario(store, tarefa) {
    var novo = !tarefa;
    var valores = tarefa || { titulo: '', data: u.hoje(), prioridade: false };

    ui.abrirFormulario({
      titulo: novo ? 'Nova tarefa' : 'Editar tarefa',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'Tarefa', tipo: 'texto', obrigatorio: true, dica: 'Ex.: marcar consulta' },
        { nome: 'data', rotulo: 'Para quando', tipo: 'data', ajuda: 'Deixe em branco para "algum dia"' },
        { nome: 'prioridade', rotulo: 'Marcar como prioridade', tipo: 'alternar' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) {
          s.tarefas = s.tarefas.filter(function (t) { return t.id !== tarefa.id; });
        });
        ui.toast('Tarefa excluída');
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) {
            s.tarefas.push({
              id: u.id(), titulo: v.titulo, data: v.data || null,
              feita: false, prioridade: v.prioridade, criadaEm: u.hoje()
            });
          } else {
            Object.assign(tarefa, { titulo: v.titulo, data: v.data || null, prioridade: v.prioridade });
          }
        });
        ui.toast(novo ? 'Tarefa criada' : 'Tarefa atualizada');
        App.render();
      }
    });
  }

  function linha(store, t) {
    var atrasada = !t.feita && t.data && t.data < u.hoje();
    return ui.itemMarcavel({
      titulo: t.titulo,
      feito: t.feita,
      meta: [
        t.data ? el('span' + (atrasada ? '.chip.chip--warn' : ''), {
          text: (atrasada ? 'atrasada · ' : '') + u.dataRelativa(t.data)
        }) : el('span', { text: 'algum dia' }),
        t.prioridade ? el('span.chip', { text: '★' }) : null
      ].filter(Boolean),
      aoMarcar: function () {
        store.commit(function () { t.feita = !t.feita; });
        App.render();
      },
      aoAbrir: function () { formulario(store, t); }
    });
  }

  /* Abertas primeiro por data (sem data no fim) e prioridades acima. */
  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1;
      if (!a.data && !b.data) return a.criadaEm < b.criadaEm ? -1 : 1;
      if (!a.data) return 1;
      if (!b.data) return -1;
      return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0);
    });
  }

  function entradaRapida(store) {
    var input = el('input', {
      type: 'text',
      placeholder: 'Nova tarefa para hoje…',
      'aria-label': 'Nova tarefa para hoje',
      autocomplete: 'off'
    });

    function adicionar() {
      var titulo = input.value.trim();
      if (!titulo) return;
      store.commit(function (s) {
        s.tarefas.push({
          id: u.id(), titulo: titulo, data: u.hoje(),
          feita: false, prioridade: false, criadaEm: u.hoje()
        });
      });
      input.value = '';
      App.render();
      /* Mantém o cursor pronto para a próxima tarefa. */
      var novo = document.querySelector('.view input[type="text"]');
      if (novo) novo.focus();
    }

    var form = el('form.field', { onsubmit: function (e) { e.preventDefault(); adicionar(); } },
      [el('div', { style: 'display:flex;gap:8px' }, [
        input,
        el('button.btn.btn--primary', { type: 'submit', text: 'Adicionar' })
      ])]);

    return form;
  }

  App.views = App.views || {};
  App.views.tarefas = {
    titulo: 'Tarefas',
    render: function (store) {
      var todas = store.estado.tarefas;
      var abertas = ordenar(todas.filter(function (t) { return !t.feita; }));
      var feitas = todas.filter(function (t) { return t.feita; }).reverse();

      return el('div', {}, [
        el('div', { style: 'margin:6px 0 4px' }, [entradaRapida(store)]),
        el('button.btn.btn--block.btn--ghost.btn--sm', {
          type: 'button', text: 'Tarefa com data ou prioridade…',
          onclick: function () { formulario(store, null); }
        }),

        el('div.section-head', {}, [
          el('h2', { text: 'Em aberto' }),
          el('span', { text: u.plural(abertas.length, 'tarefa', 'tarefas') })
        ]),
        abertas.length
          ? el('div.stack.stack--tight', {}, abertas.map(function (t) { return linha(store, t); }))
          : ui.vazio('Tudo em dia', 'Nenhuma tarefa em aberto por aqui.'),

        feitas.length ? el('div.section-head', {}, [
          el('h2', { text: 'Concluídas' }),
          el('button.link-btn', {
            type: 'button',
            text: mostrarFeitas ? 'ocultar' : 'ver ' + feitas.length,
            onclick: function () { mostrarFeitas = !mostrarFeitas; App.render(); }
          })
        ]) : null,
        feitas.length && mostrarFeitas
          ? el('div.stack.stack--tight', {}, feitas.map(function (t) { return linha(store, t); }))
          : null,
        feitas.length && mostrarFeitas
          ? el('button.btn.btn--sm.btn--danger.btn--block', {
              type: 'button', text: 'Limpar concluídas',
              style: 'margin-top:10px',
              onclick: function () {
                if (!confirm('Remover as ' + feitas.length + ' tarefas concluídas?')) return;
                store.commit(function (s) {
                  s.tarefas = s.tarefas.filter(function (t) { return !t.feita; });
                });
                ui.toast('Concluídas removidas');
                App.render();
              }
            })
          : null
      ]);
    }
  };
})();
