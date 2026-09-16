import type { ReactNode } from 'react';

/**
 * A colour chip that always carries a label. Colour is decoration here, never
 * the only carrier of meaning.
 */
export function Badge({
  children,
  color,
  emoji,
  tone = 'soft',
  className = '',
}: {
  children: ReactNode;
  /** CSS colour, usually a palette custom property. */
  color?: string;
  emoji?: string;
  tone?: 'soft' | 'solid' | 'outline';
  className?: string;
}) {
  const style =
    tone === 'solid'
      ? { background: color ?? 'var(--accent)', color: '#fff' }
      : tone === 'outline'
        ? { borderColor: color ?? 'var(--hairline-strong)', color: 'var(--ink-2)' }
        : { background: 'var(--surface-2)', color: 'var(--ink-2)' };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tone === 'outline' ? 'border' : 'border-transparent'} ${className}`}
      style={style}
    >
      {tone !== 'solid' && color ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
