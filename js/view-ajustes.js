/* Tela "Ajustes": preferências, backup e recomeço. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  function baixarBackup(store) {
    var nome = 'minha-rotina-' + u.hoje() + '.json';
    var blob = new Blob([store.exportar()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    ui.aviso('Backup salvo: ' + nome);
  }

  function restaurarBackup(store) {
    var input = el('input', { type: 'file', accept: 'application/json,.json' });
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var arquivo = input.files && input.files[0];
      if (!arquivo) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        try {
          store.importar(String(leitor.result));
          App.aplicarTema();
          ui.aviso('Backup restaurado');
          App.render();
        } catch (e) { ui.aviso('Arquivo inválido'); }
      };
      leitor.readAsText(arquivo);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(function () { input.remove(); }, 0);
  }

  function bloco(titulo, descricao, filhos) {
    return el('div.cartao.pilha.pilha--junta', {}, [
      el('div.item__titulo', { text: titulo }),
      descricao ? el('p.mini.sub', { text: descricao }) : null,
      el('div.linha-btn', {}, filhos)
    ].filter(Boolean));
  }

  var SECOES = [
    { chave: 'objetivos', nome: 'Objetivos' },
    { chave: 'estudos', nome: 'Estudos' },
    { chave: 'autocuidado', nome: 'Autocuidado' },
    { chave: 'espiritual', nome: 'Vida espiritual' }
  ];

  App.views = App.views || {};
  App.views.ajustes = {
    titulo: 'Ajustes',
    render: function (store) {
      var a = store.estado.ajustes;
      var e = store.estado;

      var campoNome = el('input', {
        type: 'text', value: a.nome, placeholder: 'Como você quer ser chamada?', 'aria-label': 'Seu nome',
        onchange: function () {
          var v = campoNome.value.trim();
          store.commit(function (s) { s.ajustes.nome = v; });
          ui.aviso('Prontinho');
        }
      });

      function campoHora(chave, rotulo) {
        var input = el('input', {
          type: 'time', value: a[chave], 'aria-label': rotulo,
          onchange: function () {
            var v = input.value;
            store.commit(function (s) { s.ajustes[chave] = v; });
            ui.aviso('Horário salvo');
          }
        });
        return el('div.campo', {}, [el('label', { text: rotulo }), input]);
      }

      return el('div.pilha', { style: 'margin-top:8px' }, [
        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Seu nome' }),
          el('div.campo', {}, [campoNome]),
          el('p.mini.fraco', { text: 'Usado só na saudação da tela Hoje.' })
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Meus horários' }),
          el('p.mini.sub', { text: 'O assistente usa esses limites para saber onde cabe cada coisa.' }),
          el('div.duo', {}, [campoHora('acordar', 'Costumo acordar'), campoHora('dormir', 'Costumo dormir')])
        ]),

        bloco('Aparência', 'Vale para este aparelho.', ['auto', 'claro', 'escuro'].map(function (t) {
          var rotulos = { auto: 'Automático', claro: 'Claro', escuro: 'Escuro' };
          return el('button.btn.btn--p' + (a.tema === t ? '.btn--principal' : '.btn--fantasma'), {
            type: 'button', text: rotulos[t],
            onclick: function () {
              store.commit(function (s) { s.ajustes.tema = t; });
              App.aplicarTema();
              App.render();
            }
          });
        })),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Áreas que quero ver' }),
          el('p.mini.sub', { text: 'Desligue o que não faz sentido para você — o app não precisa ter tudo.' }),
          el('div.linha-btn', {}, SECOES.map(function (s) {
            var ativo = a.secoes[s.chave] !== false;
            return el('button.opcao', {
              type: 'button', text: s.nome, 'aria-pressed': ativo ? 'true' : 'false',
              onclick: function () {
                store.commit(function (st) { st.ajustes.secoes[s.chave] = !ativo; });
                App.render();
              }
            });
          }))
        ]),

        bloco('Backup', 'Tudo fica só neste aparelho. Guarde uma cópia de vez em quando.', [
          el('button.btn.btn--p', { type: 'button', text: '⤓ Baixar backup', onclick: function () { baixarBackup(store); } }),
          el('button.btn.btn--p', { type: 'button', text: '⤒ Restaurar backup', onclick: function () { restaurarBackup(store); } })
        ]),

        bloco('Rotina de exemplo', 'Substitui tudo pelo modelo inicial, com rotina, rituais, cuidados e matérias.', [
          el('button.btn.btn--p', {
            type: 'button', text: 'Carregar exemplo',
            onclick: function () {
              if (!confirm('Isso substitui sua rotina atual pelo exemplo. Continuar?')) return;
              store.semear();
              ui.aviso('Exemplo carregado');
              App.render();
            }
          })
        ]),

        bloco('Recomeçar', 'Você escolhe se mantém a estrutura (rotina, rituais, matérias) ou apaga tudo.', [
          el('button.btn.btn--p.btn--perigo', {
            type: 'button', text: 'Limpar histórico',
            onclick: function () {
              if (!confirm('Apagar marcações, tarefas, sessões e revisões, mantendo a estrutura?')) return;
              store.limpar(true);
              ui.aviso('Histórico limpo');
              App.render();
            }
          }),
          el('button.btn.btn--p.btn--perigo', {
            type: 'button', text: 'Apagar tudo',
            onclick: function () {
              if (!confirm('Apagar TUDO mesmo? Não dá para desfazer.')) return;
              store.limpar(false);
              ui.aviso('Tudo apagado');
              App.render();
            }
          })
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Sobre' }),
          el('p.mini.sub', { text: 'Minha Rotina funciona sem internet e não envia nada para lugar nenhum. ' +
            'No celular, use “Adicionar à tela de início” para abrir como aplicativo.' }),
          el('p.mini.fraco', { text:
            e.blocos.length + ' atividades · ' + e.eventos.length + ' compromissos · ' +
            e.rituais.length + ' rituais · ' + e.tarefas.length + ' tarefas · ' +
            e.objetivos.length + ' objetivos · ' + e.disciplinas.length + ' disciplinas · ' +
            Object.keys(e.registro).length + ' dias registrados' }),
          el('p.mini.fraco', { style: 'font-style:italic',
            text: 'Organizar a vida para vivê-la melhor — não viver para cumprir a organização.' })
        ])
      ]);
    }
  };
})();
