# Minha Rotina

Uma central de vida pessoal — não uma lista de tarefas. O aplicativo organiza o
dia, a agenda, os estudos, os hábitos, o autocuidado, a espiritualidade, o
descanso e os objetivos em um só lugar, **sem conta, sem internet e sem enviar
nada para lugar nenhum**: tudo fica salvo no armazenamento do próprio aparelho.

> Organizar a vida para vivê-la melhor — não viver para cumprir a organização.

## Como abrir

**Mais simples:** baixe a pasta e abra `index.html` no navegador.

**Como aplicativo no celular (recomendado):** publique a pasta em qualquer
endereço `https` — o GitHub Pages serve, basta ativar nas configurações do
repositório —, abra o link no celular e escolha *Adicionar à tela de início*.
Ele passa a abrir em tela cheia e funciona offline.

**Localmente com servidor:**

```bash
python3 -m http.server 8000    # depois abra http://localhost:8000
```

## As áreas

| Tela | O que faz |
| --- | --- |
| 🏠 **Hoje** | O dia em manhã, tarde e noite, com o que está acontecendo agora, os rituais do momento, as tarefas, o autocuidado devido e o fechamento do dia. |
| 🗓️ **Agenda** | Calendário e rotina juntos: compromissos de um dia e atividades recorrentes na mesma linha do tempo, com horários fixos marcados como tal. |
| ✅ **Tarefas** | Prioridade em três níveis, tempo estimado, prazo e vínculo com objetivos. |
| 📚 **Estudos** | Disciplina → assunto → conteúdo, sessões cronometradas e distribuição automática de conteúdos pelos dias até o prazo. |
| 🎯 **Minha vida** | Objetivos por área (estudos, futuro, eu, casa, vida pessoal), quebrados em passos que viram tarefas agendadas. |
| 🌿 **Hábitos** | Rituais contextualizados (rotina da manhã, rotina noturna) em vez de caixinhas soltas, com itens "só para hoje" e a pergunta "quer manter amanhã?". |
| ✨ **Autocuidado** | Pele, cabelo, unhas, corpo e organização, com a próxima data calculada sozinha a partir do ritmo de cada cuidado. |
| 🕊️ **Vida espiritual** | Práticas, intenções e diário, com o tempo litúrgico calculado offline. Sem sequência, sem pontuação: um dia sem marcar não apaga nada. |
| 📊 **Minha semana** | Estudos, sono, exercícios, autocuidado, descanso e tarefas — lidos com gentileza, seguidos de uma reflexão sua. |
| 🤖 **Assistente** | Organiza o dia a partir de uma frase escrita do seu jeito, sugere o que fazer no tempo que você tem e ajuda a tirar peso da lista. |

## A inteligência da rotina

Tudo roda no seu aparelho, com regras — não há serviço externo nem modelo de
linguagem envolvido. O que o app faz sozinho:

- **Entende uma frase e monta o dia.** "Amanhã tenho aula até meio-dia, quero
  estudar duas horas, preciso arrumar meu quarto e quero descansar" vira uma
  distribuição com horários, respeitando o que já existe na sua rotina, quebrando
  estudos longos em blocos com pausa e remarcando o que for flexível.
- **Avisa quando o dia está cheio demais** e ajuda a decidir o que fica, o que
  pode ser adiado (→) e o que pode sair (×), mostrando prioridade e tempo estimado.
- **Cobra descanso.** Se o dia não tem nenhuma pausa, o app diz isso e reserva
  30 minutos no primeiro espaço livre. Descanso é categoria de primeira classe,
  ao lado de estudo e compromisso.
- **Responde "tenho 30 minutos".** Escolhe entre tarefas, conteúdos de estudo,
  cuidados atrasados e passos de objetivos — e explica por que sugeriu aquilo.
- **Distribui conteúdos de estudo** pelos dias disponíveis até a data da prova.
- **Calcula a próxima vez** de cada cuidado recorrente e o tempo litúrgico do dia.

## Backup

Os dados vivem apenas neste aparelho: limpar os dados do navegador apaga tudo.
Em **Ajustes → Backup** dá para baixar um `.json` com toda a rotina e o histórico
e restaurá-lo depois, inclusive em outro aparelho. Dados da primeira versão do
app são migrados automaticamente na primeira abertura.

## Aparência

A identidade é a **Papel & Rosa**: fundo de papel, rosa antigo como cor
principal, verde sálvia no que já foi concluído, azul claro nos compromissos.
Sem sombras — o que separa os blocos são linhas finas, cantos quase retos e
espaço — com títulos em serifada e tema claro e escuro.

Tudo isso vive nas variáveis do topo de `assets/styles.css` (cores, fonte dos
títulos, arredondamento e sombra): mudar uma linha ali muda o app inteiro, e o
mesmo conjunto se repete no bloco do tema escuro. As cores das áreas da vida —
os pontinhos ao lado de "Estudo", "Descanso", "Autocuidado" — ficam em
`js/store.js`, no início do arquivo.

## Como o projeto é feito

HTML, CSS e JavaScript puro — sem dependências, sem build.

```
index.html              estrutura, barra de navegação e painel
assets/styles.css       identidade visual "Papel & Rosa" (tokens no topo do arquivo)
js/util.js              datas, horários, formatação e criação de elementos
js/store.js             modelo de dados, persistência e migração
js/motor.js             inteligência: monta o dia, analisa, sugere, interpreta frases
js/ui.js                formulários em painel, avisos, listas e componentes
js/view-*.js            uma tela por arquivo
js/app.js               rotas por hash, renderização e tema
sw.js                   cache para funcionar offline
manifest.webmanifest    instalação como aplicativo
```

Cada tela é uma função `render(store)` que devolve um elemento; toda alteração
passa por `store.commit(...)`, que salva no `localStorage` e redesenha a tela.
O motor (`js/motor.js`) não toca no DOM — é só regra, o que o mantém testável.
