import { useRef, useState } from 'react';
import { LEAD_DAY_OPTIONS } from '@/domain/constants';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ChipGroup, Switch, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { activeReminders } from '@/services/reminders';
import {
  notificationPermission,
  requestNotificationPermission,
} from '@/services/reminders';
import { currentBackend, exportState, parseImportedState, CURRENT_VERSION } from '@/lib/storage/persistence';
import { listProviders } from '@/services/ai/registry';
import { useAppState, useDispatch } from '@/state/store';

const BACKEND_LABEL: Record<string, string> = {
  indexeddb: 'IndexedDB (banco local do navegador)',
  localstorage: 'localStorage (reserva)',
  memory: 'somente memória — os dados não vão persistir',
};

export function SettingsPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const settings = state.reminderSettings;
  const [permission, setPermission] = useState(notificationPermission());
  const [resetOpen, setResetOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const reminders = activeReminders(state);
  const providers = listProviders();

  async function enableNotifications(enabled: boolean) {
    if (!enabled) {
      dispatch({ type: 'reminders/update', patch: { browserNotifications: false } });
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    dispatch({
      type: 'reminders/update',
      patch: { browserNotifications: result === 'granted' },
    });
  }

  function download() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rotine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedState(String(reader.result));
        dispatch({ type: 'data/import', state: imported });
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.');
      }
    };
    reader.onerror = () => setImportError('Não foi possível ler o arquivo.');
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon="🔔"
          title="Lembretes"
          subtitle={`${reminders.length} ${reminders.length === 1 ? 'lembrete ativo' : 'lembretes ativos'} agora.`}
        />
        <Switch
          label="Ativar lembretes"
          description="Avisos sobre provas, entregas e o que estudar hoje."
          checked={settings.enabled}
          onChange={(v) => dispatch({ type: 'reminders/update', patch: { enabled: v } })}
        />

        {settings.enabled ? (
          <div className="mt-3 space-y-4">
            <ChipGroup
              label="Com quanta antecedência avisar"
              hint="pode escolher mais de um"
              options={LEAD_DAY_OPTIONS.map((d) => ({
                value: d,
                label: d === 0 ? 'No dia' : d === 1 ? '1 dia antes' : `${d} dias antes`,
              }))}
              selected={settings.leadDays}
              onToggle={(value) =>
                dispatch({
                  type: 'reminders/update',
                  patch: {
                    leadDays: settings.leadDays.includes(value)
                      ? settings.leadDays.filter((d) => d !== value)
                      : [...settings.leadDays, value],
                  },
                })
              }
            />

            <div className="rounded-xl border border-hairline bg-surface-2 px-3 py-1">
              <Switch
                label="Avisar sobre o plano do dia"
                description="Ex.: “Hoje você programou estudar Biologia.”"
                checked={settings.dailyPlanReminder}
                onChange={(v) =>
                  dispatch({ type: 'reminders/update', patch: { dailyPlanReminder: v } })
                }
              />
              <Switch
                label="Avisar sobre atividades atrasadas"
                checked={settings.overdueReminder}
                onChange={(v) =>
                  dispatch({ type: 'reminders/update', patch: { overdueReminder: v } })
                }
              />
            </div>

            {settings.dailyPlanReminder ? (
              <TextField
                label="Horário do aviso diário"
                type="time"
                value={settings.dailyPlanTime}
                onChange={(e) =>
                  dispatch({ type: 'reminders/update', patch: { dailyPlanTime: e.target.value } })
                }
              />
            ) : null}

            <div className="rounded-xl border border-hairline bg-surface-2 px-3 py-1">
              <Switch
                label="Mostrar notificações do sistema"
                description={
                  permission === 'unsupported'
                    ? 'Este navegador não suporta notificações.'
                    : permission === 'denied'
                      ? 'Permissão negada — libere nas configurações do navegador.'
                      : 'Além do sininho, aparece como notificação do aparelho.'
                }
                checked={settings.browserNotifications && permission === 'granted'}
                onChange={enableNotifications}
              />
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          icon="💾"
          title="Seus dados"
          subtitle="Tudo fica salvo neste dispositivo e continua lá depois de fechar o app."
        />
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Armazenamento</dt>
            <dd className="text-right font-medium text-ink">
              {BACKEND_LABEL[currentBackend()] ?? currentBackend()}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Versão do banco</dt>
            <dd className="tabular font-medium text-ink">v{CURRENT_VERSION}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Conteúdos na ementa</dt>
            <dd className="tabular font-medium text-ink">{state.contents.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Compromissos</dt>
            <dd className="tabular font-medium text-ink">{state.events.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Sessões de estudo</dt>
            <dd className="tabular font-medium text-ink">{state.sessions.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Respostas de questões</dt>
            <dd className="tabular font-medium text-ink">{state.answers.length}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={download} icon="⬇️">
            Baixar backup
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} icon="⬆️">
            Restaurar backup
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--color-critical)]"
            onClick={() => setResetOpen(true)}
          >
            Apagar tudo
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = '';
          }}
        />
        {importError ? (
          <p role="alert" className="mt-2 text-sm text-[var(--color-critical)]">
            {importError}
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          icon="✨"
          title="Geração do plano"
          subtitle="O app já é preparado para gerar planos, resumos e questões com IA. Hoje o motor local responde por tudo, sem enviar nada para fora."
        />
        <ul className="space-y-2">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="rounded-xl border border-hairline bg-surface-2 p-3"
            >
              <p className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                {provider.label}
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                  style={{
                    background: provider.available ? 'var(--color-good)' : 'var(--hairline-strong)',
                    color: provider.available ? '#fff' : 'var(--ink-2)',
                  }}
                >
                  {provider.available ? 'Ativo' : 'Indisponível'}
                </span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Recursos:{' '}
                {Object.entries(provider.capabilities)
                  .filter(([, enabled]) => enabled)
                  .map(([key]) =>
                    key === 'plan'
                      ? 'plano'
                      : key === 'summary'
                        ? 'resumos'
                        : key === 'questions'
                          ? 'questões'
                          : 'recomendações',
                  )
                  .join(', ')}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Apagar todos os dados?"
        description="Provas, atividades, progresso, sessões e respostas serão perdidos. A ementa volta ao estado original."
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'data/reset' });
                setResetOpen(false);
              }}
            >
              Apagar tudo
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          Essa ação não pode ser desfeita. Se quiser guardar uma cópia, feche esta janela e use{' '}
          <strong className="font-semibold">Baixar backup</strong> primeiro.
        </p>
      </Modal>
    </div>
  );
}
