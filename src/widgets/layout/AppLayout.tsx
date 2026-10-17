import { Outlet } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { isDemo } from '../../app/container';
import { usePhoneLayout } from '../../shared/hooks/usePhoneLayout';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MiniWidget } from './MiniWidget';
import { TaskModal } from '../tasks/task-modal/TaskModal';
import { EventModal } from '../agenda/EventModal';
import { UpdateBanner } from '../updates/UpdateBanner';

/** Squelette de l'application : barre de titre, navigation, page courante et modales globales. */
export function AppLayout() {
  const isMiniOpen = useUiStore((s) => s.isMiniOpen);
  const phone = usePhoneLayout();

  if (phone) {
    // Téléphone : pas de barre de titre, onglets en bas, marges pour l'encoche et la barre système.
    return (
      <div className="phone-app" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{ height: 'env(safe-area-inset-top)', flexShrink: 0, background: 'var(--bg)' }} />
        <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <UpdateBanner />
          <Outlet />
        </main>
        <BottomNav />
        <TaskModal />
        <EventModal />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <UpdateBanner />
          <Outlet />
        </main>
      </div>
      {isDemo && isMiniOpen && <MiniWidget />}
      <TaskModal />
      <EventModal />
    </div>
  );
}
