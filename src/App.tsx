import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useReminderRuntime } from '@/hooks/useReminderRuntime';
import { useTheme } from '@/hooks/useTheme';
import { CalendarPage } from '@/pages/CalendarPage';
import { Dashboard } from '@/pages/Dashboard';
import { MorePage } from '@/pages/MorePage';
import { Onboarding } from '@/pages/Onboarding';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProgressPage } from '@/pages/ProgressPage';
import { QuestionsPage } from '@/pages/QuestionsPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StudyNowPage } from '@/pages/StudyNowPage';
import { StudyPlanPage } from '@/pages/StudyPlanPage';
import { SubjectsPage } from '@/pages/SubjectsPage';
import { SyllabusPage } from '@/pages/SyllabusPage';
import { StoreProvider, useStore } from '@/state/store';

/**
 * Hash routing keeps every deep link working when the built app is served from
 * a static host or opened straight from the file system.
 */
function Routed() {
  const { state, ready } = useStore();
  useTheme(state.profile.theme);
  useReminderRuntime();

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-sm text-ink-muted" role="status">
          Carregando seus dados…
        </p>
      </div>
    );
  }

  if (!state.profile.onboarded) return <Onboarding />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/ementa" element={<SyllabusPage />} />
        <Route path="/plano" element={<StudyPlanPage />} />
        <Route path="/estudar" element={<StudyNowPage />} />
        <Route path="/progresso" element={<ProgressPage />} />
        <Route path="/revisar" element={<ReviewPage />} />
        <Route path="/questoes" element={<QuestionsPage />} />
        <Route path="/disciplinas" element={<SubjectsPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="/mais" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routed />
      </HashRouter>
    </StoreProvider>
  );
}
