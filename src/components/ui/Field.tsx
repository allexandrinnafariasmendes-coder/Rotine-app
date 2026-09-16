import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';

const CONTROL =
  'w-full rounded-xl border border-hairline bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-accent focus:bg-surface focus:outline-none';

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-2">
      {children}
      {hint ? <span className="ml-1 font-normal text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  hint,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <input id={id} className={CONTROL} {...rest} />
      {error ? <p className="mt-1 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <textarea id={id} rows={3} className={`${CONTROL} resize-y`} {...rest} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  options,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <select id={id} className={`${CONTROL} appearance-none pr-8`} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A row of mutually exclusive choices. Used for status, priority and views. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; emoji?: string }[];
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <div
        role="group"
        aria-label={label}
        className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-hairline bg-surface-2 p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-lg px-2.5 font-medium whitespace-nowrap transition ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'} ${
                active
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-muted hover:bg-surface-hover hover:text-ink-2'
              }`}
            >
              {option.emoji ? (
                <span aria-hidden="true" className="mr-1">
                  {option.emoji}
                </span>
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-hairline-strong'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-200 ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

/** Multi-select pill list — subjects in the plan form, lead times in settings. */
export function ChipGroup<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
  hint,
}: {
  label?: string;
  options: { value: T; label: string; emoji?: string; color?: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  hint?: string;
}) {
  return (
    <div>
      {label ? <Label hint={hint}>{label}</Label> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'border-accent bg-accent-soft text-accent-soft-ink'
                  : 'border-hairline bg-surface-2 text-ink-2 hover:bg-surface-hover'
              }`}
            >
              {option.color ? (
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: option.color }}
                />
              ) : null}
              {option.emoji ? <span aria-hidden="true">{option.emoji}</span> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
