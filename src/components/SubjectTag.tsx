import { slotColor } from '@/domain/constants';
import type { Subject } from '@/domain/types';

export function subjectColor(subject: Subject | undefined): string {
  return subject ? slotColor(subject.colorSlot) : 'var(--ink-muted)';
}

/** Subject identity: a colour dot plus the name. Never colour alone. */
export function SubjectTag({
  subject,
  size = 'md',
  showEmoji = true,
}: {
  subject: Subject | undefined;
  size?: 'sm' | 'md';
  showEmoji?: boolean;
}) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 font-medium text-ink-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ background: subjectColor(subject) }}
      />
      {showEmoji && subject ? <span aria-hidden="true">{subject.emoji}</span> : null}
      <span className="truncate">{subject?.name ?? 'Sem disciplina'}</span>
    </span>
  );
}

/** Dense square used in calendar cells. */
export function SubjectDot({ subject, title }: { subject: Subject | undefined; title?: string }) {
  return (
    <span
      title={title}
      aria-hidden="true"
      className="size-1.5 shrink-0 rounded-full"
      style={{ background: subjectColor(subject) }}
    />
  );
}
