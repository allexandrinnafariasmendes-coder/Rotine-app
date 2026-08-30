/* Tela "Ajustes": preferências, backup dos dados e recomeço. */
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
    ui.toast('Backup salvo: ' + nome);
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
          ui.toast('Backup restaurado');
          App.render();
        } catch (e) {
          ui.toast('Arquivo inválido');
        }
      };
      leitor.readAsText(arquivo);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(function () { input.remove(); }, 0);
  }

  function bloco(titulo, descricao, filhos) {
    return el('div.card.stack.stack--tight', {}, [
      el('div.item__title', { text: titulo }),
      descricao ? el('p.tiny.muted', { text: descricao }) : null,
      el('div.row', {}, filhos)
    ].filter(Boolean));
  }

  App.views = App.views || {};
  App.views.ajustes = {
    titulo: 'Ajustes',
    render: function (store) {
      var ajustes = store.estado.ajustes;
      var e = store.estado;

      var campoNome = el('input', {
        type: 'text', value: ajustes.nome, placeholder: 'Como quer ser chamada?',
        'aria-label': 'Seu nome',
        onchange: function () {
          var valor = campoNome.value.trim();
          store.commit(function (s) { s.ajustes.nome = valor; });
          ui.toast('Prontinho');
        }
      });

      var temas = [
        { v: 'auto', r: 'Automático' },
        { v: 'light', r: 'Claro' },
        { v: 'dark', r: 'Escuro' }
      ];

      return el('div.stack', { style: 'margin-top:8px' }, [
        el('div.card.stack.stack--tight', {}, [
          el('div.item__title', { text: 'Seu nome' }),
          el('div.field', {}, [campoNome]),
          el('p.tiny.muted', { text: 'Usado apenas na saudação da tela Hoje.' })
        ]),

        bloco('Aparência', 'Vale para este aparelho.', temas.map(function (t) {
          var ativo = ajustes.tema === t.v;
          return el('button' + (ativo ? '.btn.btn--sm.btn--primary' : '.btn.btn--sm.btn--ghost'), {
            type: 'button', text: t.r,
            onclick: function () {
              store.commit(function (s) { s.ajustes.tema = t.v; });
              App.aplicarTema();
              App.render();
            }
          });
        })),

        bloco('Backup', 'Seus dados ficam só neste aparelho. Guarde uma cópia de vez em quando.', [
          el('button.btn.btn--sm', { type: 'button', text: '⤓ Baixar backup', onclick: function () { baixarBackup(store); } }),
          el('button.btn.btn--sm', { type: 'button', text: '⤒ Restaurar backup', onclick: function () { restaurarBackup(store); } })
        ]),

        bloco('Rotina de exemplo', 'Substitui atividades, hábitos e tarefas pelo modelo inicial.', [
          el('button.btn.btn--sm', {
            type: 'button', text: 'Carregar exemplo',
            onclick: function () {
              if (!confirm('Isso substitui sua rotina atual pelo exemplo. Continuar?')) return;
              store.semear();
              ui.toast('Exemplo carregado');
              App.render();
            }
          })
        ]),

        bloco('Recomeçar', 'Apaga o histórico de marcações. Você escolhe se mantém a rotina.', [
          el('button.btn.btn--sm.btn--danger', {
            type: 'button', text: 'Limpar histórico',
            onclick: function () {
              if (!confirm('Apagar o histórico de marcações e as tarefas, mantendo atividades e hábitos?')) return;
              store.limpar(true);
              ui.toast('Histórico limpo');
              App.render();
            }
          }),
          el('button.btn.btn--sm.btn--danger', {
            type: 'button', text: 'Apagar tudo',
            onclick: function () {
              if (!confirm('Apagar TUDO: rotina, hábitos, tarefas e histórico. Tem certeza?')) return;
              store.limpar(false);
              ui.toast('Tudo apagado');
              App.render();
            }
          })
        ]),

        el('div.card.stack.stack--tight', {}, [
          el('div.item__title', { text: 'Sobre' }),
          el('p.tiny.muted', { text:
            'Minha Rotina funciona sem internet e não envia nada para lugar nenhum: ' +
            'tudo fica salvo no armazenamento deste navegador. ' +
            'No celular, use "Adicionar à tela de início" para abrir como aplicativo.' }),
          el('p.tiny.muted', { text:
            e.blocos.length + ' atividades · ' + e.habitos.length + ' hábitos · ' +
            e.tarefas.length + ' tarefas · ' + Object.keys(e.registro).length + ' dias registrados' })
        ])
      ]);
    }
  };
})();
