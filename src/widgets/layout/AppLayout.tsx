import { Outlet } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { isDesktopApp } from '../../app/container';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { MiniWidget } from './MiniWidget';
import { TaskModal } from '../tasks/task-modal/TaskModal';
import { EventModal } from '../agenda/EventModal';
import { UpdateBanner } from '../updates/UpdateBanner';

/** Squelette de l'application : barre de titre, navigation, page courante et modales globales. */
export function AppLayout() {
  const isMiniOpen = useUiStore((s) => s.isMiniOpen);
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
      {!isDesktopApp && isMiniOpen && <MiniWidget />}
      <TaskModal />
      <EventModal />
    </div>
  );
}
