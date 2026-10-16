import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CalendarIcon, CheckSquareIcon, SettingsIcon, TimerIcon, TrashIcon } from '../../shared/icons/Icons';
import { isActive } from '../../domain/focus/focus';
import { useFocusStore } from '../../store/focusStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useDeletedTasks } from '../../store/taskStore';
import { useUpdateStore } from '../../store/updateStore';

function Tab({ to, label, icon, badge, dot, live }: {
  to: string; label: string; icon: ReactNode; badge?: number; dot?: boolean; live?: 'running' | 'paused';
}) {
  return (
    <NavLink to={to} className="bottom-nav-item" aria-label={label} style={({ isActive: active }) => ({
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      textDecoration: 'none', fontSize: 10, fontWeight: active ? 600 : 500,
      color: active ? 'var(--accent)' : 'var(--text-muted)', position: 'relative', height: 56,
    })}>
      {({ isActive: active }) => (
        <>
          <span style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 28, borderRadius: 14,
            background: active ? 'var(--accent-bg)' : 'transparent', transition: 'background .15s',
          }}>
            {icon}
            {!!badge && (
              <span style={{
                position: 'absolute', top: -2, right: 8, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 8,
                background: 'var(--danger)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{badge > 99 ? '99+' : badge}</span>
            )}
            {dot && <span style={{ position: 'absolute', top: 0, right: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 2px var(--sidebar)' }} />}
            {live && (
              <span className={live === 'running' ? 'focus-live' : undefined} style={{
                position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)', width: 14, height: 3, borderRadius: 2,
                background: live === 'running' ? 'var(--accent)' : 'var(--warn)',
              }} />
            )}
          </span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Navigation principale sur téléphone : onglets en bas de l'écran, au-dessus de la barre système. */
export function BottomNav() {
  const deleted = useDeletedTasks();
  const trashSeenAt = useSettingsStore((s) => s.trashSeenAt);
  const markTrashSeen = useSettingsStore((s) => s.markTrashSeen);
  const onTrashPage = useLocation().pathname.startsWith('/trash');
  const updateVersion = useUpdateStore((s) => s.available?.version);
  const focusStatus = useFocusStore((s) => (isActive(s.session) ? (s.session.status as 'running' | 'paused') : undefined));

  useEffect(() => {
    if (onTrashPage) markTrashSeen();
  }, [onTrashPage, deleted.length, markTrashSeen]);
  const trashCount = onTrashPage ? 0 : deleted.filter((t) => t.updated_at > trashSeenAt).length;

  return (
    <nav aria-label="Navigation" style={{
      flexShrink: 0, display: 'flex', background: 'var(--sidebar)', borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
    }}>
      <Tab to="/tasks" label="Tâches" icon={<CheckSquareIcon size={19} />} />
      <Tab to="/agenda" label="Agenda" icon={<CalendarIcon size={19} />} />
      <Tab to="/focus" label="Focus" icon={<TimerIcon size={19} />} live={focusStatus} />
      <Tab to="/trash" label="Corbeille" icon={<TrashIcon size={19} />} badge={trashCount} />
      <Tab to="/settings" label="Réglages" icon={<SettingsIcon size={19} />} dot={!!updateVersion} />
    </nav>
  );
}
