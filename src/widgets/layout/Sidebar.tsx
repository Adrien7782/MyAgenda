import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CalendarIcon, CheckSquareIcon, SettingsIcon, TimerIcon, TrashIcon, WidgetIcon } from '../../shared/icons/Icons';
import { isActive } from '../../domain/focus/focus';
import { useFocusStore } from '../../store/focusStore';
import { useMiniWindowController } from '../mini/useMiniWindowController';
import { useSettingsStore } from '../../store/settingsStore';
import { useDeletedTasks } from '../../store/taskStore';
import { useUpdateStore } from '../../store/updateStore';
import { AppLogo } from './AppLogo';

const NAV = [
  { to: '/tasks', Icon: CheckSquareIcon, label: 'Tâches' },
  { to: '/agenda', Icon: CalendarIcon, label: 'Agenda' },
  { to: '/focus', Icon: TimerIcon, label: 'Concentration' },
  { to: '/trash', Icon: TrashIcon, label: 'Corbeille' },
];

function navStyle(active: boolean): React.CSSProperties {
  return {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0, position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
    background: active ? 'var(--accent-bg)' : 'transparent',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 33%, transparent)' : 'transparent'}`,
    boxShadow: active ? '0 0 12px color-mix(in srgb, var(--accent) 16%, transparent)' : 'none',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all .18s',
  };
}

function SidebarLink({ to, label, children, badge, dot, live }: { to: string; label: string; children: ReactNode; badge?: number; dot?: boolean; live?: 'running' | 'paused' }) {
  return (
    <NavLink to={to} title={label} aria-label={label} style={({ isActive }) => navStyle(isActive)}>
      {children}
      {!!badge && (
        <span style={{
          position: 'absolute', top: 3, right: 3, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7,
          background: 'var(--danger)', color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
      {live && (
        <span aria-hidden className={live === 'running' ? 'focus-live' : undefined} style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 14, height: 3, borderRadius: 2,
          background: live === 'running' ? 'var(--accent)' : 'var(--warn)',
        }} />
      )}
      {dot && (
        <span aria-hidden style={{
          position: 'absolute', top: 5, right: 5, width: 9, height: 9, borderRadius: '50%',
          background: 'var(--accent)', boxShadow: '0 0 0 2px var(--sidebar), 0 0 8px var(--accent)',
        }} />
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const mini = useMiniWindowController();
  const deleted = useDeletedTasks();
  const trashSeenAt = useSettingsStore((s) => s.trashSeenAt);
  const markTrashSeen = useSettingsStore((s) => s.markTrashSeen);
  const onTrashPage = useLocation().pathname.startsWith('/trash');
  const updateVersion = useUpdateStore((s) => s.available?.version);
  const focusStatus = useFocusStore((s) => (isActive(s.session) ? (s.session.status as 'running' | 'paused') : undefined));

  // Visiter la corbeille = son contenu est pris en compte : la pastille disparaît.
  useEffect(() => {
    if (onTrashPage) markTrashSeen();
  }, [onTrashPage, deleted.length, markTrashSeen]);

  const trashCount = onTrashPage ? 0 : deleted.filter((t) => t.updated_at > trashSeenAt).length;

  return (
    <nav style={{
      width: 64, minWidth: 64, flexShrink: 0, background: 'var(--sidebar)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 6,
    }}>
      <div style={{ marginBottom: 18 }}><AppLogo /></div>

      {NAV.map(({ to, Icon, label }) => (
        <SidebarLink key={to} to={to}
          label={to === '/focus' && focusStatus ? `Concentration — ${focusStatus === 'running' ? 'séance en cours' : 'en pause'}` : label}
          badge={to === '/trash' ? trashCount : undefined}
          live={to === '/focus' ? focusStatus : undefined}>
          <Icon size={18} />
        </SidebarLink>
      ))}

      <div style={{ flex: 1 }} />

      <button type="button" title={mini.isOpen ? 'Fermer My Agenda Mini' : 'Ouvrir My Agenda Mini'} aria-label="Mode mini" aria-pressed={mini.isOpen} onClick={() => void mini.toggle()} style={navStyle(mini.isOpen)}>
        <WidgetIcon size={18} />
      </button>
      <SidebarLink to="/settings" label={updateVersion ? `Réglages — version ${updateVersion} disponible` : 'Réglages'} dot={!!updateVersion}>
        <SettingsIcon size={18} />
      </SidebarLink>
    </nav>
  );
}
