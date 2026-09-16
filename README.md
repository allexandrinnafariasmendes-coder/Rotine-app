# Rotine — Assistente Escolar do Ensino Médio

Rotine é um aplicativo web para estudantes do Ensino Médio que reúne, em um só
lugar: calendário de provas e atividades, a ementa completa do Ensino Médio,
um gerador de plano de estudos, lembretes automáticos, sessões de estudo com
cronômetro, banco de questões e acompanhamento de progresso.

O diferencial do app é responder a uma pergunta só: **"Tenho uma prova. O que
preciso estudar, quanto tempo tenho e como devo organizar meus estudos?"** —
unindo organização escolar, ementa e plano de estudos em vez de ser só mais
um calendário.

## Rodando o projeto

```bash
npm install
npm run dev        # ambiente de desenvolvimento em http://localhost:5173
npm run build       # build de produção em dist/
npm run preview     # serve o build de produção
npm run typecheck   # checagem de tipos sem gerar arquivos
```

Não há variáveis de ambiente nem backend: é um app 100% client-side, feito
para ser hospedado como site estático (o `base: './'` no `vite.config.ts`
permite abrir o build a partir de qualquer subpasta ou até do disco local).

## Instalar no celular (PWA)

O Rotine é um **Progressive Web App**: instala como um app de verdade — ícone
na tela inicial, abre em tela cheia (sem barra de endereço) e continua
funcionando sem internet depois da primeira visita, porque todo o app é
pré-armazenado no aparelho por um service worker (`vite-plugin-pwa`) e os
dados já ficam salvos localmente (IndexedDB).

**Publicação automática.** Todo push nas branches `main` e
`claude/school-app-high-school-1330i5` builda o app e publica no GitHub
Pages (veja `.github/workflows/deploy-pages.yml`). Isso exige uma única
configuração manual, feita uma vez pelo dono do repositório:

1. No GitHub, abra **Settings → Pages**.
2. Em **Source**, escolha **GitHub Actions**.
3. Depois do primeiro workflow rodar com sucesso, o app fica em
   `https://<usuário>.github.io/Rotine-app/`.

**Instalando no aparelho**, depois de abrir esse link:

- **Android (Chrome):** toque no menu (⋮) → **Instalar app** (ou o banner
  "Adicionar à tela inicial" que aparece sozinho).
- **iPhone/iPad (Safari):** toque em **Compartilhar** (o ícone de
  quadrado com seta) → **Adicionar à Tela de Início**. Precisa ser pelo
  Safari — o Chrome no iOS não tem essa opção.
- **Computador (Chrome/Edge):** ícone de instalação (⊕) na barra de
  endereço.

Depois de instalado, o ícone abre o app sozinho, sem navegador visível, e
volta a funcionar mesmo se o Wi-Fi cair — só a primeira abertura precisa de
internet.

## Stack

- **React 19 + TypeScript** — componentes funcionais, tipagem estrita.
- **Vite** — build e dev server.
- **Tailwind CSS v4** — tokens de tema em `src/styles/index.css`, com paleta
  categórica e cores de status validadas para daltonismo e contraste
  (light e dark mode nativos, com troca por `prefers-color-scheme` ou por
  seleção manual em Perfil).
- **React Router (modo hash)** — navegação com links profundos que
  funcionam mesmo servindo o build como arquivo estático.
- **IndexedDB com fallback para localStorage** — toda a persistência local
  (ver `src/lib/storage/`), com migração de esquema versionada para novas
  versões do app.

## Estrutura

```
src/
  domain/            tipos e constantes do domínio (eventos, disciplinas,
                      conteúdos, prioridade, status…)
  data/
    subjects.ts       as 13 disciplinas padrão do Ensino Médio
    curriculum/        a ementa completa: ano → disciplina → unidade →
                       conteúdo → subconteúdos, para as 13 disciplinas
    questions.ts       banco de questões de exemplo, ligado à ementa

  services/           lógica pura, sem React — pode ser testada isoladamente
    priority.ts        motor de priorização de conteúdos (a peça central)
    studyPlan.ts        gerador do cronograma de estudos
    reminders.ts        lembretes derivados de eventos + configurações
    progress.ts         métricas de progresso, sequência de dias, gráficos
    review.ts           fila de revisão (spaced repetition + eventos + erros)
    ai/                 a "porta" para IA: uma interface (`AIProvider`) hoje
                       implementada localmente (`heuristic.ts`, sem rede),
                       pronta para receber um provedor remoto no futuro
                       através do `registry.ts` — nenhuma tela precisa mudar.

  state/               reducer + Context/useReducer para o estado global,
                      com persistência automática (debounced) a cada mudança

  components/
    ui/                Button, Card, Modal, campos de formulário,
                       ProgressBar/ProgressRing, StatTile — o design system
    charts/            gráfico de barras de horas de estudo (uma série,
                       paleta validada, tooltip, vista em tabela)
    layout/            AppShell (sidebar no desktop, tab bar no celular),
                       painel de lembretes
    forms/             formulário de evento (com vínculo a conteúdos)

  pages/               uma página por tela do produto (veja abaixo)
```

## Telas

| Rota | Tela |
|---|---|
| `/` | Dashboard — saudação, próxima prova, atrasos, o que estudar hoje, progresso geral |
| `/calendario` | Calendário mensal, semanal e em lista, com filtro por tipo de evento |
| `/ementa` | "O que preciso estudar?" — a ementa navegável e marcável |
| `/plano` | Gerador de plano de estudos, com cronograma dia a dia |
| `/estudar` | Modo "Estudar agora" — cronômetro, checklist, anotações |
| `/progresso` | Percentuais, horas estudadas, sequência, progresso por disciplina |
| `/revisar` | Fila de revisão automática |
| `/questoes` | Banco de exercícios com correção e estatísticas |
| `/disciplinas` | Gerenciar disciplinas (adicionar, editar, arquivar) |
| `/perfil` | Dados do aluno e metas de estudo |
| `/ajustes` | Configuração de lembretes, backup/restauração e status do armazenamento |

## Dados e privacidade

Tudo fica salvo no dispositivo do estudante (IndexedDB), inclusive depois de
fechar o app ou o navegador. Em Ajustes é possível baixar um backup em JSON e
restaurá-lo depois — não há conta, login ou envio de dados para servidores.

## Extensão futura

- **IA real**: implemente `AIProvider` (`src/services/ai/provider.ts`) e
  registre com `registerProvider(...)`. A tela de plano de estudos, o resumo
  do modo "Estudar agora" e a lista de recomendações de revisão já chamam a
  interface, não uma implementação concreta.
- **Backend/sincronização**: o estado inteiro é um único objeto serializável
  (`AppState`), com versionamento de esquema em `src/lib/storage/schema.ts` —
  o mesmo formato pode alimentar uma API sem mudanças no restante do app.
- **Mais disciplinas/conteúdos**: `src/data/curriculum/*.ts` segue um
  formato simples de *seeds* (`[nome, [subtópicos]]`); adicionar conteúdo é
  só estender o array correspondente.
