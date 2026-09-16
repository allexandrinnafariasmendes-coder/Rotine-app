export interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the mobile bar. */
  short: string;
  emoji: string;
  /** Shown in the phone bottom bar. */
  primary: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', short: 'Início', emoji: '🏠', primary: true },
  { to: '/calendario', label: 'Calendário', short: 'Agenda', emoji: '📅', primary: true },
  { to: '/ementa', label: 'O que preciso estudar?', short: 'Ementa', emoji: '🧭', primary: true },
  { to: '/plano', label: 'Plano de estudos', short: 'Plano', emoji: '🗂️', primary: true },
  { to: '/estudar', label: 'Estudar agora', short: 'Estudar', emoji: '⏱️', primary: true },
  { to: '/progresso', label: 'Progresso', short: 'Progresso', emoji: '📈', primary: false },
  { to: '/revisar', label: 'Revisar', short: 'Revisar', emoji: '🔁', primary: false },
  { to: '/questoes', label: 'Questões', short: 'Questões', emoji: '🎯', primary: false },
  { to: '/disciplinas', label: 'Disciplinas', short: 'Matérias', emoji: '📚', primary: false },
  { to: '/perfil', label: 'Perfil', short: 'Perfil', emoji: '🙋', primary: false },
  { to: '/ajustes', label: 'Lembretes e dados', short: 'Ajustes', emoji: '⚙️', primary: false },
];
