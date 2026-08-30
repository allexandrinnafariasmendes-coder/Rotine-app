/* Funções auxiliares: datas, formatação e criação de elementos. */
(function () {
  'use strict';

  var App = window.App || (window.App = {});

  var DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var DIAS_MINI = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  var DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* Datas são sempre tratadas no fuso local, no formato AAAA-MM-DD. */
  function toISO(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function fromISO(iso) {
    var p = String(iso).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function hoje() { return toISO(new Date()); }

  function somarDias(iso, n) {
    var d = fromISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  function diaDaSemana(iso) { return fromISO(iso).getDay(); }

  function dataLonga(iso) {
    var d = fromISO(iso);
    var dia = DIAS_LONGOS[d.getDay()];
    return dia.charAt(0).toUpperCase() + dia.slice(1) + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  function dataCurta(iso) {
    var d = fromISO(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  }

  /* Rótulo relativo — "hoje", "amanhã", "ontem" ou a data curta. */
  function dataRelativa(iso) {
    if (iso === hoje()) return 'hoje';
    if (iso === somarDias(hoje(), 1)) return 'amanhã';
    if (iso === somarDias(hoje(), -1)) return 'ontem';
    return dataCurta(iso);
  }

  /* Lista dos últimos n dias terminando em `ate` (inclusive). */
  function ultimosDias(n, ate) {
    var fim = ate || hoje();
    var out = [];
    for (var i = n - 1; i >= 0; i--) out.push(somarDias(fim, -i));
    return out;
  }

  function minutosDe(hhmm) {
    if (!hhmm) return null;
    var p = hhmm.split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function duracaoTexto(min) {
    if (!min) return '';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return m ? h + 'h' + pad(m) : h + 'h';
  }

  function periodoDe(hhmm) {
    var m = minutosDe(hhmm);
    if (m === null) return 'flex';
    if (m < 12 * 60) return 'manha';
    if (m < 18 * 60) return 'tarde';
    return 'noite';
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function pct(feito, total) {
    if (!total) return 0;
    return Math.round((feito / total) * 100);
  }

  function plural(n, um, muitos) { return n + ' ' + (n === 1 ? um : muitos); }

  /* Criação de elementos: el('div.card', {onclick: fn}, [filhos|texto]) */
  function el(spec, attrs, filhos) {
    var partes = spec.split('.');
    var node = document.createElement(partes.shift() || 'div');
    if (partes.length) node.className = partes.join(' ');

    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else node.setAttribute(k, v === true ? '' : v);
    });

    []
      .concat(filhos === undefined ? [] : filhos)
      .forEach(function (f) {
        if (f === null || f === undefined || f === false) return;
        node.appendChild(typeof f === 'string' || typeof f === 'number'
          ? document.createTextNode(String(f))
          : f);
      });

    return node;
  }

  App.util = {
    DIAS_CURTOS: DIAS_CURTOS,
    DIAS_MINI: DIAS_MINI,
    DIAS_LONGOS: DIAS_LONGOS,
    pad: pad,
    toISO: toISO,
    fromISO: fromISO,
    hoje: hoje,
    somarDias: somarDias,
    diaDaSemana: diaDaSemana,
    dataLonga: dataLonga,
    dataCurta: dataCurta,
    dataRelativa: dataRelativa,
    ultimosDias: ultimosDias,
    minutosDe: minutosDe,
    duracaoTexto: duracaoTexto,
    periodoDe: periodoDe,
    id: id,
    pct: pct,
    plural: plural,
    el: el
  };
})();
