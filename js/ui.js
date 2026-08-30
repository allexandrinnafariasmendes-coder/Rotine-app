/* Componentes de interface reaproveitados pelas telas:
   painel de formulário, avisos, anel de progresso e itens de lista. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util;
  var el = u.el;

  var backdrop, sheet, sheetTitulo, sheetForm, toastEl, toastTimer;

  function iniciar() {
    backdrop = document.getElementById('sheetBackdrop');
    sheet = document.getElementById('sheet');
    sheetTitulo = document.getElementById('sheetTitle');
    sheetForm = document.getElementById('sheetForm');
    toastEl = document.getElementById('toast');

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) fecharPainel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !backdrop.hidden) fecharPainel();
    });
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }

  function fecharPainel() {
    backdrop.hidden = true;
    sheetForm.innerHTML = '';
  }

  /* Monta um campo do formulário e devolve como ler seu valor. */
  function campo(def, valores) {
    var wrap = el('div.field');
    var idCampo = 'f_' + def.nome;
    var ler;

    if (def.tipo !== 'dias') {
      wrap.appendChild(el('label', { for: idCampo, text: def.rotulo }));
    } else {
      wrap.appendChild(el('label', { text: def.rotulo }));
    }

    if (def.tipo === 'texto' || def.tipo === 'hora' || def.tipo === 'numero' || def.tipo === 'data') {
      var tipoHtml = { texto: 'text', hora: 'time', numero: 'number', data: 'date' }[def.tipo];
      var input = el('input', {
        id: idCampo,
        type: tipoHtml,
        value: valores[def.nome] === null || valores[def.nome] === undefined ? '' : valores[def.nome],
        placeholder: def.dica || '',
        min: def.min,
        max: def.max,
        step: def.passo,
        inputmode: def.tipo === 'numero' ? 'numeric' : null,
        autocomplete: 'off'
      });
      wrap.appendChild(input);
      ler = function () {
        var v = input.value.trim();
        if (def.tipo === 'numero') return v === '' ? 0 : Number(v);
        return v;
      };

    } else if (def.tipo === 'texto-longo') {
      var area = el('textarea', { id: idCampo, placeholder: def.dica || '' });
      area.value = valores[def.nome] || '';
      wrap.appendChild(area);
      ler = function () { return area.value.trim(); };

    } else if (def.tipo === 'selecao') {
      var sel = el('select', { id: idCampo }, def.opcoes.map(function (o) {
        return el('option', { value: o.valor, text: o.rotulo, selected: valores[def.nome] === o.valor });
      }));
      wrap.appendChild(sel);
      ler = function () { return sel.value; };

    } else if (def.tipo === 'dias') {
      var marcados = (valores[def.nome] || []).slice();
      var linha = el('div.days');
      u.DIAS_MINI.forEach(function (letra, i) {
        var ativo = marcados.indexOf(i) !== -1;
        var pill = el('button.days__pill', {
          type: 'button',
          text: letra,
          title: u.DIAS_CURTOS[i],
          'aria-pressed': ativo ? 'true' : 'false',
          onclick: function () {
            var pos = marcados.indexOf(i);
            if (pos === -1) marcados.push(i); else marcados.splice(pos, 1);
            pill.setAttribute('aria-pressed', pos === -1 ? 'true' : 'false');
          }
        });
        linha.appendChild(pill);
      });
      wrap.appendChild(linha);
      ler = function () { return marcados.slice().sort(); };

    } else if (def.tipo === 'alternar') {
      var check = el('input', { id: idCampo, type: 'checkbox' });
      check.checked = !!valores[def.nome];
      check.style.width = 'auto';
      wrap.appendChild(check);
      ler = function () { return check.checked; };
    }

    if (def.ajuda) wrap.appendChild(el('div.field__hint', { text: def.ajuda }));

    return { node: wrap, ler: ler, def: def };
  }

  /* Abre o painel inferior com um formulário.
     campos: [{nome, rotulo, tipo, obrigatorio, ...}]
     aoSalvar(valores) — devolver false cancela o fechamento. */
  function abrirFormulario(opcoes) {
    sheetTitulo.textContent = opcoes.titulo;
    sheetForm.innerHTML = '';

    var valores = opcoes.valores || {};
    var campos = opcoes.campos.map(function (def) { return campo(def, valores); });

    campos.forEach(function (c) {
      if (c.def.junto && sheetForm.lastChild && sheetForm.lastChild.classList.contains('grid-2')
          && sheetForm.lastChild.childElementCount < 2) {
        sheetForm.lastChild.appendChild(c.node);
      } else if (c.def.junto) {
        sheetForm.appendChild(el('div.grid-2', {}, [c.node]));
      } else {
        sheetForm.appendChild(c.node);
      }
    });

    var acoes = el('div.row.row--end', {}, [
      opcoes.aoExcluir
        ? el('button.btn.btn--danger', {
            type: 'button',
            text: 'Excluir',
            onclick: function () {
              if (confirm('Excluir "' + (valores.titulo || 'este item') + '"? Isso não pode ser desfeito.')) {
                opcoes.aoExcluir();
                fecharPainel();
              }
            }
          })
        : null,
      el('button.btn.btn--ghost', { type: 'button', text: 'Cancelar', onclick: fecharPainel }),
      el('button.btn.btn--primary', { type: 'submit', text: opcoes.rotuloSalvar || 'Salvar' })
    ]);
    acoes.style.marginTop = '4px';
    sheetForm.appendChild(acoes);

    sheetForm.onsubmit = function (e) {
      e.preventDefault();
      var out = {};
      var faltando = null;

      campos.forEach(function (c) {
        var v = c.ler();
        out[c.def.nome] = v;
        if (c.def.obrigatorio && (v === '' || (Array.isArray(v) && !v.length))) {
          faltando = faltando || c.def.rotulo;
        }
      });

      if (faltando) { toast('Preencha: ' + faltando); return; }
      if (opcoes.aoSalvar(out) !== false) fecharPainel();
    };

    backdrop.hidden = false;
    var primeiro = sheetForm.querySelector('input, textarea, select');
    if (primeiro && primeiro.type !== 'time') setTimeout(function () { primeiro.focus(); }, 60);
  }

  /* Anel de progresso em SVG. */
  function anel(porcento) {
    var raio = 32, circ = 2 * Math.PI * raio;
    var offset = circ * (1 - Math.max(0, Math.min(100, porcento)) / 100);
    var ns = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '76');
    svg.setAttribute('height', '76');
    svg.setAttribute('viewBox', '0 0 76 76');
    svg.setAttribute('aria-hidden', 'true');

    [['ring__track', circ, 0], ['ring__bar', circ, offset]].forEach(function (cfg) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('class', cfg[0]);
      c.setAttribute('cx', '38');
      c.setAttribute('cy', '38');
      c.setAttribute('r', String(raio));
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke-width', '7');
      c.setAttribute('stroke-dasharray', String(cfg[1]));
      c.setAttribute('stroke-dashoffset', String(cfg[2]));
      svg.appendChild(c);
    });

    return el('div.ring', { role: 'img', 'aria-label': porcento + '% do dia concluído' }, [
      svg,
      el('div.ring__label', { text: porcento + '%' })
    ]);
  }

  /* Item de lista com caixa de seleção à esquerda. */
  function itemMarcavel(opcoes) {
    var classes = 'div.item' + (opcoes.feito ? '.item--done' : '');
    return el(classes, {}, [
      el('button.item__check', {
        type: 'button',
        text: '✓',
        'aria-pressed': opcoes.feito ? 'true' : 'false',
        'aria-label': (opcoes.feito ? 'Desmarcar ' : 'Marcar ') + opcoes.titulo,
        onclick: opcoes.aoMarcar
      }),
      opcoes.hora ? el('span.item__time', { text: opcoes.hora }) : null,
      el('div.item__body', { onclick: opcoes.aoAbrir || null, style: opcoes.aoAbrir ? 'cursor:pointer' : null }, [
        el('div.item__title', { text: opcoes.titulo }),
        opcoes.meta && opcoes.meta.length ? el('div.item__meta', {}, opcoes.meta) : null
      ]),
      opcoes.direita || null
    ]);
  }

  function vazio(titulo, texto) {
    return el('div.empty', {}, [el('strong', { text: titulo }), texto || '']);
  }

  App.ui = {
    iniciar: iniciar,
    toast: toast,
    abrirFormulario: abrirFormulario,
    fecharPainel: fecharPainel,
    anel: anel,
    itemMarcavel: itemMarcavel,
    vazio: vazio
  };
})();
