/* Quadro "Fé, estudo e disciplina" — a rotina que alimenta o app.

   Este arquivo é a única parte pessoal do projeto: trocá-lo troca a rotina
   inicial sem mexer em mais nada. `id` identifica o quadro, `versao` sobe a
   cada mudança e `notas` conta o que mudou, para o app poder avisar e aplicar
   sem apagar marcações. */
(function () {
  'use strict';

  var App = window.App || (window.App = {});

  App.rotinaBase = {
    id: 'fe-estudo-disciplina',
    nome: 'Fé, estudo e disciplina',
    lemaExemplo: 'Ad Deum per vitam ordinariam.',
    versao: 4,
    notas: {
      2: 'Missa às 18h nos dias de semana; treino e adoração passam para as 17h30.',
      3: 'Inglês no sábado, das 9h ao meio-dia. A administração da casa sai da manhã de sábado e vira meia hora por dia, às 6h, de segunda a sexta.',
      4: 'Sai o exercício físico: treino, atividade de sábado, passeio de domingo, o item do checklist, a prioridade e a saída correspondente. O horário fica livre.'
    },
    montar: function (u) {
    var todos = [0, 1, 2, 3, 4, 5, 6];
    var semana = [1, 2, 3, 4, 5];
    var fimDeSemana = [0, 6];
    var aula = [1, 3, 5];
    var estudo = [2, 4];

    /* A chave identifica a atividade entre versões do quadro: é por ela que
       uma atualização encontra o bloco certo e preserva o que já foi marcado. */
    function bloco(chave, titulo, hora, duracao, dias, area, fixo, nota) {
      return { id: u.id(), chave: chave, titulo: titulo, hora: hora, duracao: duracao,
               dias: dias, area: area, fixo: !!fixo, nota: nota || '' };
    }

    return {
      blocos: [
        bloco('acordar', 'Acordar · Oferecer o dia a Deus', '05:00', 30, todos, 'sono', true, 'Um copo de água ao acordar.'),
        bloco('oracao-manha', 'Oração da manhã · Leitura espiritual · Terço', '05:30', 30, todos, 'espiritual', false, ''),
        bloco('missa-fds', 'Missa', '06:00', 30, fimDeSemana, 'espiritual', true, ''),
        bloco('cafe', 'Café da manhã · Arrumar-se', '06:30', 30, todos, 'alimentacao', false, 'Preparar-se para o dia.'),
        bloco('revisao-dia', 'Revisão do dia', '07:00', 30, todos, 'pessoal', false, ''),
        bloco('saida', 'Saída · Deslocamento · Organização', '07:30', 30, todos, 'pessoal', false, ''),

        bloco('aulas-manha', 'Aulas', '08:00', 240, aula, 'escola', true, ''),
        bloco('estudos-manha', 'Estudos / Tarefas', '08:00', 240, estudo, 'estudo', false, ''),
        bloco('ingles', 'Inglês', '09:00', 180, [6], 'escola', true, ''),
        bloco('missa-dominical', 'Missa dominical e comunidade', '08:00', 240, [0], 'espiritual', true, ''),

        bloco('casa', 'Casa · Organização', '06:00', 30, semana, 'casa', false, 'Um pouco por dia rende mais que uma manhã inteira.'),

        bloco('almoco', 'Almoço · Gratidão · Descanso breve', '12:00', 30, todos, 'alimentacao', false, ''),
        bloco('leitura-leve', 'Leitura leve', '12:30', 60, aula, 'hobby', false, ''),
        bloco('descanso-tarde', 'Descanso', '12:30', 60, [2, 4, 6], 'descanso', false, ''),
        bloco('almoco-familia', 'Almoço em família · Descanso', '12:30', 60, [0], 'pessoal', false, ''),

        bloco('aulas-tarde', 'Aulas', '13:30', 240, aula, 'escola', true, ''),
        bloco('estudos-tarde', 'Estudos / Tarefas', '13:30', 240, estudo, 'estudo', false, ''),
        bloco('estudos-sabado', 'Estudos pessoais / Projetos', '13:30', 240, [6], 'estudo', false, ''),
        bloco('familia-domingo', 'Tempo com família · Lazer · Leitura', '13:30', 240, [0], 'pessoal', false, ''),

        /* Nos dias de semana a Missa é às 18h; treino e adoração passam
           para as 17h30, logo depois das aulas. */
        bloco('adoracao', 'Oração / Terço · Adoração', '17:30', 30, estudo, 'espiritual', false, 'Adoração, se possível.'),
        bloco('missa-semana', 'Missa', '18:00', 30, semana, 'espiritual', true, ''),

        bloco('banho-jantar', 'Banho · Jantar', '18:30', 30, todos, 'alimentacao', false, ''),

        bloco('estudos-noite', 'Estudos', '19:00', 60, aula, 'estudo', false, ''),
        bloco('formacao-noite', 'Leitura espiritual / Formação', '19:00', 60, estudo, 'espiritual', false, ''),
        bloco('livre-sabado', 'Livre · Filme bom · Família', '19:00', 60, [6], 'hobby', false, ''),
        bloco('planejamento-domingo', 'Planejamento da semana · Leitura', '19:00', 60, [0], 'pessoal', false, ''),

        bloco('revisar-conteudo', 'Revisar conteúdo · Exercícios / Trabalhos', '20:00', 60, todos, 'estudo', false, ''),
        bloco('dormir', 'Descanso · Dormir bem', '22:00', 0, todos, 'sono', true, 'Dormir bem para servir melhor amanhã.')
      ],

      eventos: [],

      rituais: [
        { id: u.id(), chave: 'checklist-diario', titulo: 'Checklist diário', periodo: 'qualquer', hora: '', dias: todos, itens: [
          { id: u.id(), titulo: 'Missa' },
          { id: u.id(), titulo: 'Oração' },
          { id: u.id(), titulo: 'Estudos' },
          { id: u.id(), titulo: 'Leitura' },
          { id: u.id(), titulo: 'Gratidão' }
        ] },
        { id: u.id(), chave: 'oracao-noite', titulo: 'Oração da noite', periodo: 'noite', hora: '21:00', dias: todos, itens: [
          { id: u.id(), titulo: 'Exame de consciência' },
          { id: u.id(), titulo: 'Oração da noite' },
          { id: u.id(), titulo: 'Agradecimentos' }
        ] }
      ],

      cuidados: [],
      objetivos: [],
      disciplinas: [],
      sessoes: [],
      tarefas: [],

      alternativas: [
        { id: u.id(), quando: 'Se não conseguir estudar', saida: 'Faça uma leitura espiritual ou revise anotações.' },
        { id: u.id(), quando: 'Se o dia estiver pesado', saida: 'Respire, reze o terço e confie em Deus.' },
        { id: u.id(), quando: 'No fim de semana', saida: 'Reserve um tempo para lazer e convívio.' }
      ],

      prioridades: [
        'Missa todos os dias (6h)',
        'Estudos e tarefas',
        'Tempo de oração',
        'Descanso de qualidade',
        'Alimentação saudável'
      ],

      lema: 'Ad Deum per vitam ordinariam.',

      espiritual: {
        praticas: [
          { id: u.id(), titulo: 'Oração da manhã', momento: 'manha' },
          { id: u.id(), titulo: 'Terço', momento: 'qualquer' },
          { id: u.id(), titulo: 'Leitura espiritual', momento: 'tarde' },
          { id: u.id(), titulo: 'Exame de consciência', momento: 'noite' }
        ],
        intencoes: [],
        diario: []
      }
    };
  }
  };
})();
