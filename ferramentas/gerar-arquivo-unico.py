#!/usr/bin/env python3
"""Gera minha-rotina.html: o app inteiro em um arquivo só.

Junta o CSS e todos os scripts dentro do index.html, para que o app possa ser
guardado como um único arquivo e aberto com dois cliques, sem servidor e sem
internet. Use depois de mexer no código:

    python3 ferramentas/gerar-arquivo-unico.py
"""

import base64
import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'minha-rotina.html'


def ler(caminho):
    return (RAIZ / caminho).read_text(encoding='utf-8')


def main():
    html = ler('index.html')

    # o ícone vira data URI, para o arquivo não depender da pasta assets/
    icone = base64.b64encode(ler('assets/icon.svg').encode('utf-8')).decode('ascii')
    html = html.replace('href="assets/icon.svg"', 'href="data:image/svg+xml;base64,%s"' % icone)

    # a folha de estilo entra inteira no lugar do <link>
    css = ler('assets/styles.css')
    html = re.sub(
        r'  <link rel="stylesheet" href="assets/styles\.css" />',
        '  <style>\n%s\n  </style>' % css,
        html,
    )

    # sem servidor não há manifesto nem service worker
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)

    def inline(m):
        return '<script>\n%s\n</script>' % ler(m.group(1))

    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

    aviso = ('<!-- Minha Rotina — arquivo único, gerado por '
             'ferramentas/gerar-arquivo-unico.py.\n'
             '     Seus dados ficam no armazenamento deste navegador; guarde um backup '
             'pelo próprio app. -->\n')
    SAIDA.write_text(aviso + html, encoding='utf-8')
    print('%s · %.0f KB' % (SAIDA.name, SAIDA.stat().st_size / 1024))


if __name__ == '__main__':
    main()
