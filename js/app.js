/* Arranque: rota por hash, renderização e tema. */
(function () {
  'use strict';

  var App = window.App;
  var store = App.store;

  var ROTAS = ['hoje', 'rotina', 'habitos', 'tarefas', 'progresso', 'ajustes'];
  var viewEl, tituloEl, tabbar;

  function rotaAtual() {
    var hash = (location.hash || '').replace('#/', '');
    return ROTAS.indexOf(hash) !== -1 ? hash : 'hoje';
  }

  function aplicarTema() {
    var tema = store.estado.ajustes.tema || 'auto';
    document.documentElement.setAttribute('data-theme', tema);
  }

  function render() {
    var rota = rotaAtual();
    var view = App.views[rota];

    tituloEl.textContent = view.titulo;
    document.title = view.titulo + ' · Minha Rotina';

    var conteudo = view.render(store);
    viewEl.innerHTML = '';
    viewEl.appendChild(conteudo);

    Array.prototype.forEach.call(tabbar.querySelectorAll('.tab'), function (a) {
      var ativo = a.dataset.route === rota;
      a.classList.toggle('is-active', ativo);
      if (ativo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function trocarRota() {
    render();
    window.scrollTo(0, 0);
  }

  function iniciar() {
    viewEl = document.getElementById('view');
    tituloEl = document.getElementById('viewTitle');
    tabbar = document.getElementById('tabbar');

    store.iniciar();
    App.ui.iniciar();
    aplicarTema();

    document.getElementById('themeToggle').addEventListener('click', function () {
      var ordem = ['auto', 'light', 'dark'];
      var proximo = ordem[(ordem.indexOf(store.estado.ajustes.tema || 'auto') + 1) % 3];
      store.commit(function (s) { s.ajustes.tema = proximo; });
      aplicarTema();
      App.ui.toast('Tema: ' + { auto: 'automático', light: 'claro', dark: 'escuro' }[proximo]);
      render();
    });

    window.addEventListener('hashchange', trocarRota);

    /* Ao voltar para o app depois de um tempo, o dia pode ter virado. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });

    if (!location.hash) location.replace('#/hoje');
    render();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* funciona igual sem cache */ });
    }
  }

  App.render = render;
  App.aplicarTema = aplicarTema;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
