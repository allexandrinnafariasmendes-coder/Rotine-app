/* Tela "Mais": as áreas que não cabem na barra de baixo. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el;

  var ITENS = [
    { rota: 'objetivos', emoji: '🎯', nome: 'Minha vida', desc: 'Objetivos de curto e longo prazo', secao: 'objetivos' },
    { rota: 'habitos', emoji: '🌿', nome: 'Hábitos', desc: 'Rituais da manhã, da noite e do dia' },
    { rota: 'autocuidado', emoji: '✨', nome: 'Autocuidado', desc: 'Pele, cabelo, unhas e organização', secao: 'autocuidado' },
    { rota: 'espiritual', emoji: '🕊️', nome: 'Vida espiritual', desc: 'Oração, intenções e diário', secao: 'espiritual' },
    { rota: 'semana', emoji: '📊', nome: 'Minha semana', desc: 'Reflexão e evolução, sem cobrança' },
    { rota: 'assistente', emoji: '🤖', nome: 'Assistente', desc: 'Organize meu dia, o que faço agora' },
    { rota: 'ajustes', emoji: '⚙️', nome: 'Ajustes', desc: 'Tema, horários, backup' }
  ];

  App.views = App.views || {};
  App.views.mais = {
    titulo: 'Mais',
    render: function (store) {
      var secoes = store.estado.ajustes.secoes;
      var visiveis = ITENS.filter(function (i) { return !i.secao || secoes[i.secao] !== false; });

      return el('div', {}, [
        el('p.mini.sub', { style: 'margin:8px 2px 14px',
          text: 'Sua vida inteira em um lugar só — cada área no seu ritmo.' }),
        el('div.grade-menu', {}, visiveis.map(function (i) {
          return el('a.menu-item', { href: '#/' + i.rota }, [
            el('span.menu-item__emoji', { text: i.emoji }),
            el('span.menu-item__nome', { text: i.nome }),
            el('span.menu-item__desc', { text: i.desc })
          ]);
        }))
      ]);
    }
  };
})();
