import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../widgets/layout/AppLayout';
import { TitleBar } from '../widgets/layout/TitleBar';
import { TasksPage } from '../pages/TasksPage';
import { AgendaPage } from '../pages/AgendaPage';
import { TrashPage } from '../pages/TrashPage';
import { SettingsPage } from '../pages/SettingsPage';
import { MiniApp } from '../widgets/mini/MiniApp';
import { AuthScreen } from '../widgets/auth/AuthScreen';
import { LegacyDataScreen } from '../widgets/auth/LegacyDataScreen';
import { UnconfiguredScreen } from '../widgets/auth/UnconfiguredScreen';
import { currentMiniWindow } from '../infrastructure/tauri/miniWindow';
import type { WindowRole } from '../infrastructure/tauri/windowRole';
import { applyLastTheme } from '../shared/presentation/themes';
import { useAuthStore } from '../store/authStore';
import { useAppBootstrap } from './useAppBootstrap';

/** Fenêtre (grande ou mini) avec la barre de titre et un message centré. */
function Splash({ role, message, danger }: { role: WindowRole; message: string; danger?: boolean }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {role === 'main' && <TitleBar />}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: danger ? 'var(--danger)' : 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 24, textAlign: 'center' }}>
        {message}
      </div>
    </div>
  );
}

/** Écrans hors connexion, sous la barre de titre. */
function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <TitleBar />
      {children}
    </div>
  );
}

/** Application d'un utilisateur connecté. Re-montée à chaque changement de compte (key = id). */
function SignedInApp({ role }: { role: WindowRole }) {
  const { ready, error } = useAppBootstrap(role);
  if (!ready) return <Splash role={role} message={error ? `Impossible d'ouvrir la base de données : ${error}` : 'Chargement…'} danger={!!error} />;
  if (role === 'mini') return <MiniApp />;
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App({ role }: { role: WindowRole }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    applyLastTheme();
    void useAuthStore.getState().restore();
  }, []);

  // Le mini n'a pas de sens sans compte connecté (déconnexion depuis la grande fenêtre) : il se ferme.
  useEffect(() => {
    if (role === 'mini' && (status === 'signedOut' || status === 'unconfigured')) void currentMiniWindow.close();
  }, [role, status]);

  if (status === 'signedIn' && user) return <SignedInApp key={user.id} role={role} />;
  if (role === 'mini') return <Splash role="mini" message="Connecte-toi dans la fenêtre principale." />;
  if (status === 'loading') return <Splash role="main" message="Chargement…" />;
  if (status === 'unconfigured') return <Gate><UnconfiguredScreen /></Gate>;
  if (status === 'legacyChoice') return <Gate><LegacyDataScreen /></Gate>;
  return <Gate><AuthScreen /></Gate>;
}
