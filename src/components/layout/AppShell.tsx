import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAppState } from '@/state/store';
import { activeReminders } from '@/services/reminders';
import { NAV_ITEMS } from './nav';
import { ReminderPanel } from './ReminderPanel';

/**
 * Responsive frame: a persistent sidebar from `lg` up, a bottom tab bar on
 * phones and tablets. The reminder inbox lives in the header on every size.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const reminders = activeReminders(state);
  const urgent = reminders.filter((r) => r.severity !== 'info').length;

  // Any navigation scrolls back to the top and closes the inbox.
  useEffect(() => {
    setPanelOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const current = NAV_ITEMS.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-hairline bg-surface px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-xl bg-accent text-lg text-accent-ink"
          >
            R
          </span>
          <div className="min-w-0">
            <p className="leading-tight font-bold">Rotine</p>
            <p className="text-xs text-ink-muted">Assistente escolar</p>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent-soft text-accent-soft-ink'
                    : 'text-ink-2 hover:bg-surface-hover hover:text-ink'
                }`
              }
            >
              <span aria-hidden="true" className="text-base">
                {item.emoji}
              </span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="mt-4 px-3 text-[11px] leading-relaxed text-ink-muted">
          Seus dados ficam salvos neste dispositivo, mesmo com o app fechado.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-hairline bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink lg:hidden"
            >
              R
            </span>
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
              {current?.label ?? 'Rotine'}
            </h1>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-label={`Lembretes${reminders.length > 0 ? ` (${reminders.length})` : ''}`}
              className="relative grid size-10 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-hover hover:text-ink"
            >
              <span aria-hidden="true" className="text-lg">
                🔔
              </span>
              {reminders.length > 0 ? (
                <span
                  className="tabular absolute top-1 right-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{
                    background: urgent > 0 ? 'var(--color-critical)' : 'var(--accent)',
                  }}
                >
                  {reminders.length > 9 ? '9+' : reminders.length}
                </span>
              ) : null}
            </button>
          </div>
          {panelOpen ? (
            <ReminderPanel reminders={reminders} onClose={() => setPanelOpen(false)} />
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 lg:pb-10">{children}</main>

        {/* Mobile bottom bar */}
        <nav
          aria-label="Navegação"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface/95 pb-safe backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex max-w-lg items-stretch">
            {NAV_ITEMS.filter((item) => item.primary).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                    isActive ? 'text-accent' : 'text-ink-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`grid h-7 w-12 place-items-center rounded-lg text-base transition ${isActive ? 'bg-accent-soft' : ''}`}
                    >
                      {item.emoji}
                    </span>
                    {item.short}
                  </>
                )}
              </NavLink>
            ))}
            <NavLink
              to="/mais"
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  isActive ? 'text-accent' : 'text-ink-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`grid h-7 w-12 place-items-center rounded-lg text-base transition ${isActive ? 'bg-accent-soft' : ''}`}
                  >
                    ⋯
                  </span>
                  Mais
                </>
              )}
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  );
}
