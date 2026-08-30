/* Arranque: rotas por hash, renderização e tema. */
(function () {
  'use strict';

  var App = window.App;
  var store = App.store;

  var ROTAS = ['hoje', 'agenda', 'tarefas', 'estudos', 'mais', 'objetivos', 'habitos',
               'autocuidado', 'espiritual', 'semana', 'assistente', 'ajustes'];
  var ABAS = ['hoje', 'agenda', 'tarefas', 'estudos', 'assistente', 'mais'];

  var telaEl, tituloEl, abasEl;
  var rotaAnterior = null;

  /* "#/assistente?modo=reorganizar&dia=2026-08-30" */
  function lerRota() {
    var bruto = (location.hash || '').replace(/^#\/?/, '');
    var partes = bruto.split('?');
    var nome = partes[0] || 'hoje';
    var params = {};
    (partes[1] || '').split('&').forEach(function (par) {
      if (!par) return;
      var kv = par.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { nome: ROTAS.indexOf(nome) !== -1 ? nome : 'hoje', params: params };
  }

  function temaEscuro() {
    var t = store.estado.ajustes.tema || 'auto';
    if (t === 'escuro') return true;
    if (t === 'claro') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* O acento da interface é a cor litúrgica do dia. */
  function aplicarTema() {
    var raiz = document.documentElement;
    raiz.setAttribute('data-theme', store.estado.ajustes.tema || 'auto');

    var p = App.motor.paletaLiturgica(App.util.hoje(), temaEscuro());
    raiz.style.setProperty('--sazonal', p.cores[0]);
    raiz.style.setProperty('--sazonal-suave', p.cores[1]);
    raiz.style.setProperty('--sazonal-forte', p.cores[2]);
    raiz.setAttribute('data-tempo', p.tempo);

    var selo = document.getElementById('tempoLiturgico');
    if (selo) selo.textContent = p.tempo;
  }

  function render() {
    var rota = lerRota();
    var view = App.views[rota.nome];

    if (rotaAnterior && rotaAnterior !== rota.nome) {
      var anterior = App.views[rotaAnterior];
      if (anterior && anterior.aoSair) anterior.aoSair();
    }
    if (rotaAnterior !== rota.nome && view.aoEntrar) view.aoEntrar(rota.params, store);
    rotaAnterior = rota.nome;

    tituloEl.textContent = view.titulo;
    document.title = view.titulo + ' · Minha Rotina';

    telaEl.innerHTML = '';
    telaEl.appendChild(view.render(store));

    Array.prototype.forEach.call(abasEl.querySelectorAll('.aba'), function (a) {
      var ativo = a.dataset.rota === rota.nome
        || (a.dataset.rota === 'mais' && ABAS.indexOf(rota.nome) === -1);
      a.classList.toggle('ativa', ativo);
      if (ativo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

  }

  function iniciar() {
    telaEl = document.getElementById('tela');
    tituloEl = document.getElementById('tituloTela');
    abasEl = document.getElementById('abas');

    store.iniciar();
    App.ui.iniciar();
    aplicarTema();

    document.getElementById('btnTema').addEventListener('click', function () {
      var ordem = ['auto', 'claro', 'escuro'];
      var proximo = ordem[(ordem.indexOf(store.estado.ajustes.tema || 'auto') + 1) % 3];
      store.commit(function (s) { s.ajustes.tema = proximo; });
      aplicarTema();
      App.ui.aviso('Tema: ' + proximo);
    });

    if (window.matchMedia) {
      var escura = window.matchMedia('(prefers-color-scheme: dark)');
      var aoTrocar = function () { aplicarTema(); };
      if (escura.addEventListener) escura.addEventListener('change', aoTrocar);
      else if (escura.addListener) escura.addListener(aoTrocar);
    }

    window.addEventListener('hashchange', function () {
      render();
      window.scrollTo(0, 0);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });

    if (!location.hash) location.replace('#/hoje');
    render();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* segue sem cache */ });
    }
  }

  App.render = render;
  App.aplicarTema = aplicarTema;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
