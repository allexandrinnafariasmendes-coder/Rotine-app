import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Bottom sheet on phones, centred dialog from `sm` up.
 *
 * Uses the native `<dialog>` element so focus trapping, Escape and the
 * top layer come from the platform instead of being re-implemented.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClick={(event) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (event.target === ref.current) onClose();
      }}
      className={`m-0 max-h-[92dvh] w-full max-w-full translate-y-0 overflow-visible border-0 bg-transparent p-0 backdrop:bg-[rgba(10,11,15,0.55)] backdrop:backdrop-blur-sm sm:mx-auto sm:my-auto ${size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'} fixed inset-x-0 bottom-0 sm:inset-0`}
    >
      <div className="flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-hairline bg-surface text-ink shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-hover hover:text-ink"
          >
            <span aria-hidden="true" className="text-lg">
              ✕
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline px-4 py-3 pb-safe sm:px-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
