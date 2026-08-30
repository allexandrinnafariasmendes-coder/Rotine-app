/* Tela "Minha semana": reflexão, não cobrança. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var refDia = null;

  function chaveSemana(iso) { return u.inicioDaSemana(iso); }

  function formReflexao(store, chave, atual) {
    ui.abrirFormulario({
      titulo: 'Minha semana',
      valores: atual || { funcionou: '', pesou: '', gratidao: '' },
      campos: [
        { nome: 'funcionou', rotulo: 'O que funcionou melhor para você?', tipo: 'texto-longo' },
        { nome: 'pesou', rotulo: 'O que pesou demais?', tipo: 'texto-longo' },
        { nome: 'gratidao', rotulo: 'Uma coisa boa desta semana', tipo: 'texto-longo' }
      ],
      aoSalvar: function (v) {
        store.commit(function (s) { s.semanas[chave] = v; });
        ui.aviso('Guardado');
        App.render();
      }
    });
  }

  App.views = App.views || {};
  App.views.semana = {
    titulo: 'Minha semana',
    render: function (store) {
      var motor = App.motor;
      if (!refDia) refDia = u.hoje();
      var r = motor.resumoSemana(refDia);
      var chave = chaveSemana(refDia);
      var reflexao = store.estado.semanas[chave];
      var primeiro = r.dias[0], ultimo = r.dias[6];

      var colunas = el('div.colunas', {}, r.dias.map(function (d) {
        var itens = motor.itensDoDia(d);
        var feitos = itens.filter(function (i) { return i.feito; }).length;
        var p = u.pct(feitos, itens.length);
        return el('div.coluna', {}, [
          el('div.coluna__barra' + (itens.length ? '' : '.coluna__barra--vazia'), {
            style: 'height:' + Math.max(4, p) + '%',
            title: u.dataCurta(d) + ': ' + feitos + '/' + itens.length
          }),
          el('div.coluna__dia', { text: u.DIAS_MINI[u.diaDaSemana(d)] })
        ]);
      }));

      return el('div', {}, [
        el('div.linha-btn', { style: 'margin-top:8px;align-items:center' }, [
          el('button.btn.btn--p.btn--fantasma', {
            type: 'button', text: '‹ anterior',
            onclick: function () { refDia = u.somarDias(refDia, -7); App.render(); }
          }),
          el('span.mini.fraco', { style: 'flex:1;text-align:center',
            text: u.dataCurta(primeiro) + ' – ' + u.dataCurta(ultimo) }),
          el('button.btn.btn--p.btn--fantasma', {
            type: 'button', text: 'próxima ›',
            onclick: function () { refDia = u.somarDias(refDia, 7); App.render(); }
          })
        ]),

        el('div.cartao', { style: 'margin-top:6px' }, [
          el('div.item__titulo', { style: 'font-size:19px', text: 'Como foi sua semana' }),
          el('div.pilha.pilha--junta', { style: 'margin-top:8px' },
            motor.leituraDaSemana(r).map(function (f) { return el('p.mini.sub', { text: f }); }))
        ]),

        ui.tituloSecao('Em números'),
        el('div.numeros', {}, [
          el('div.numero', {}, [
            el('div.numero__valor', { text: u.horasTexto(r.estudoMin) }),
            el('div.numero__rotulo', { text: 'estudos' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: r.mediaSono !== null ? r.mediaSono.toFixed(1).replace('.', ',') + 'h' : '—' }),
            el('div.numero__rotulo', { text: 'média de sono' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: String(r.exercicios) }),
            el('div.numero__rotulo', { text: 'sessões de exercício' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: String(r.autocuidado) }),
            el('div.numero__rotulo', { text: 'momentos de autocuidado' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: u.horasTexto(r.descansoMin) }),
            el('div.numero__rotulo', { text: 'descanso' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: r.tarefas.total ? r.tarefas.pct + '%' : '—' }),
            el('div.numero__rotulo', { text: 'das tarefas concluídas' })
          ])
        ]),

        ui.tituloSecao('Dia a dia'),
        el('div.cartao', {}, [colunas]),

        ui.tituloSecao('Reflexão'),
        el('div.cartao', {}, [
          reflexao ? el('div.pilha.pilha--junta', {}, [
            reflexao.funcionou ? el('p.mini', {}, [el('strong', { text: 'Funcionou: ' }), reflexao.funcionou]) : null,
            reflexao.pesou ? el('p.mini', {}, [el('strong', { text: 'Pesou: ' }), reflexao.pesou]) : null,
            reflexao.gratidao ? el('p.mini', {}, [el('strong', { text: 'Coisa boa: ' }), reflexao.gratidao]) : null
          ].filter(Boolean)) : el('p.mini.sub', { text: 'Duas ou três linhas bastam. Ninguém vai ler além de você.' }),
          el('button.btn.btn--p.btn--suave', { style: 'margin-top:10px',
            type: 'button', text: reflexao ? 'Editar reflexão' : 'Escrever reflexão',
            onclick: function () { formReflexao(store, chave, reflexao); } })
        ])
      ]);
    }
  };
})();
