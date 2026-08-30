/* Tela "Rotina": onde as atividades recorrentes são criadas e editadas. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var filtroDia = 'todos';   /* 'todos' ou 0..6 */

  function opcoesCategoria(store) {
    return Object.keys(store.CATEGORIAS).map(function (k) {
      return { valor: k, rotulo: store.CATEGORIAS[k].emoji + ' ' + store.CATEGORIAS[k].nome };
    });
  }

  function formulario(store, bloco) {
    var novo = !bloco;
    var valores = bloco || {
      titulo: '', hora: '', duracao: 30,
      dias: [1, 2, 3, 4, 5], categoria: 'pessoal', nota: ''
    };

    ui.abrirFormulario({
      titulo: novo ? 'Nova atividade' : 'Editar atividade',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'O que você vai fazer', tipo: 'texto', obrigatorio: true, dica: 'Ex.: caminhada de 30 min' },
        { nome: 'hora', rotulo: 'Horário', tipo: 'hora', junto: true, ajuda: 'Opcional' },
        { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', min: 0, passo: 5, junto: true },
        { nome: 'dias', rotulo: 'Dias da semana', tipo: 'dias', obrigatorio: true },
        { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: opcoesCategoria(store) },
        { nome: 'nota', rotulo: 'Observação', tipo: 'texto-longo', dica: 'Um lembrete para você mesma' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) {
          s.blocos = s.blocos.filter(function (b) { return b.id !== bloco.id; });
        });
        ui.toast('Atividade excluída');
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) {
            s.blocos.push({
              id: u.id(), titulo: v.titulo, hora: v.hora, duracao: v.duracao,
              dias: v.dias, categoria: v.categoria, nota: v.nota
            });
          } else {
            Object.assign(bloco, {
              titulo: v.titulo, hora: v.hora, duracao: v.duracao,
              dias: v.dias, categoria: v.categoria, nota: v.nota
            });
          }
        });
        ui.toast(novo ? 'Atividade criada' : 'Atividade atualizada');
        App.render();
      }
    });
  }

  function textoDias(dias) {
    if (dias.length === 7) return 'todos os dias';
    if (dias.length === 5 && [1, 2, 3, 4, 5].every(function (d) { return dias.indexOf(d) !== -1; })) return 'seg a sex';
    if (dias.length === 2 && dias.indexOf(0) !== -1 && dias.indexOf(6) !== -1) return 'fim de semana';
    return dias.map(function (d) { return u.DIAS_CURTOS[d].toLowerCase(); }).join(', ');
  }

  function filtros() {
    var opcoes = [{ v: 'todos', r: 'Todos' }].concat(u.DIAS_CURTOS.map(function (d, i) {
      return { v: i, r: d };
    }));

    return el('div.row', { style: 'margin:4px 0 8px' }, opcoes.map(function (o) {
      var ativo = String(filtroDia) === String(o.v);
      return el('button' + (ativo ? '.btn.btn--sm.btn--primary' : '.btn.btn--sm.btn--ghost'), {
        type: 'button', text: o.r,
        onclick: function () { filtroDia = o.v; App.render(); }
      });
    }));
  }

  function lista(store) {
    var blocos = filtroDia === 'todos'
      ? store.estado.blocos.slice().sort(function (a, b) {
          var ma = u.minutosDe(a.hora), mb = u.minutosDe(b.hora);
          if (ma === null) return 1;
          if (mb === null) return -1;
          return ma - mb;
        })
      : store.blocosDoDia(u.somarDias(u.hoje(), (Number(filtroDia) - u.diaDaSemana(u.hoje()) + 7) % 7));

    if (!blocos.length) {
      return ui.vazio('Nenhuma atividade aqui',
        filtroDia === 'todos' ? 'Toque em "Nova atividade" para começar.' : 'Nada programado neste dia da semana.');
    }

    return el('div.stack.stack--tight', {}, blocos.map(function (b) {
      var cat = store.CATEGORIAS[b.categoria];
      return el('div.item', { onclick: function () { formulario(store, b); }, style: 'cursor:pointer' }, [
        el('span.dot', { style: 'background:' + cat.cor + ';width:10px;height:10px' }),
        el('span.item__time', { text: b.hora || '—' }),
        el('div.item__body', {}, [
          el('div.item__title', { text: b.titulo }),
          el('div.item__meta', {}, [
            el('span', { text: textoDias(b.dias) }),
            b.duracao ? el('span', { text: u.duracaoTexto(b.duracao) }) : null,
            el('span', { text: cat.nome })
          ].filter(Boolean))
        ]),
        el('span.tiny.muted', { text: '›' })
      ]);
    }));
  }

  App.views = App.views || {};
  App.views.rotina = {
    titulo: 'Rotina',
    render: function (store) {
      return el('div', {}, [
        el('p.tiny.muted', { style: 'margin:6px 2px 12px',
          text: 'As atividades se repetem nos dias marcados. Toque em uma para editar.' }),
        el('button.btn.btn--primary.btn--block', {
          type: 'button', text: '+ Nova atividade',
          onclick: function () { formulario(store, null); }
        }),
        el('div.section-head', {}, [
          el('h2', { text: 'Minhas atividades' }),
          el('span', { text: u.plural(store.estado.blocos.length, 'atividade', 'atividades') })
        ]),
        filtros(),
        lista(store)
      ]);
    }
  };
})();
