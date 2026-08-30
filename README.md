# Minha Rotina

Aplicativo pessoal para organizar o dia: rotina fixa, hábitos, tarefas e um
resumo do progresso. Funciona no celular e no computador, **sem conta, sem
internet e sem enviar nada para lugar nenhum** — tudo fica salvo no
armazenamento do próprio navegador.

## Como abrir

**Jeito mais simples:** baixe a pasta e abra o arquivo `index.html` no
navegador (duplo clique).

**Como aplicativo no celular (recomendado):** publique a pasta em qualquer
endereço `https` (o GitHub Pages serve, basta ativar nas configurações do
repositório), abra o link no celular e escolha *Adicionar à tela de início*.
Ele passa a abrir em tela cheia e funciona offline.

**Para testar localmente com servidor:**

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## O que dá para fazer

| Aba | Para quê |
| --- | --- |
| **Hoje** | O dia em andamento, separado em manhã, tarde e noite, com anel de conclusão. Dá para voltar um dia e marcar o que ficou para trás. |
| **Rotina** | Cadastro das atividades que se repetem: horário, duração, dias da semana, categoria e uma observação. |
| **Hábitos** | Marcação diária com sequência ("🔥 5 dias seguidos") e meta semanal. A grade mostra os últimos 7 dias e qualquer um deles pode ser marcado. |
| **Tarefas** | Pendências avulsas, com data opcional, prioridade e aviso de atrasadas. |
| **Progresso** | Média dos últimos 7 dias, dias completos, maior sequência, gráfico diário, desempenho por categoria e hábitos do mês. |
| **Ajustes** | Nome na saudação, tema (automático/claro/escuro), backup em arquivo e opções de recomeço. |

Na primeira abertura vem uma rotina de exemplo — é só editar ou apagar tudo em
**Ajustes → Recomeçar**.

## Backup

Os dados vivem apenas neste aparelho: limpar os dados do navegador apaga tudo.
Em **Ajustes → Backup** dá para baixar um arquivo `.json` com toda a rotina e o
histórico, e restaurá-lo depois — inclusive em outro celular ou computador.

## Como o projeto é feito

HTML, CSS e JavaScript puro, sem dependências e sem etapa de build.

```
index.html              estrutura da página e barra de navegação
assets/styles.css       estilos e temas claro/escuro
js/util.js              datas, formatação e criação de elementos
js/store.js             estado, persistência e cálculos (sequência, progresso)
js/ui.js                painel de formulário, avisos, anel e itens de lista
js/view-*.js            uma tela por arquivo
js/app.js               rota por hash, renderização e tema
sw.js                   cache para funcionar offline
manifest.webmanifest    instalação como aplicativo
```

Cada tela é uma função `render(store)` que devolve um elemento; qualquer
alteração passa por `store.commit(...)`, que salva no `localStorage` e manda a
tela ser desenhada de novo.
