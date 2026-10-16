import type { Task } from '../../domain/task/task';
import { STATUS_LABEL_PLURAL } from '../../shared/presentation/taskPresentation';
import { useUiStore, type FilterTab } from '../../store/uiStore';
import { usePhoneLayout } from '../../shared/hooks/usePhoneLayout';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'in_progress', label: STATUS_LABEL_PLURAL.in_progress },
  { key: 'todo', label: STATUS_LABEL_PLURAL.todo },
  { key: 'waiting', label: STATUS_LABEL_PLURAL.waiting },
  { key: 'done', label: STATUS_LABEL_PLURAL.done },
];

export function FilterTabs({ tasks }: { tasks: Task[] }) {
  const filterTab = useUiStore((s) => s.filterTab);
  const setFilterTab = useUiStore((s) => s.setFilterTab);
  const phone = usePhoneLayout();
  const count = (key: FilterTab) => (key === 'all' ? tasks.length : tasks.filter((t) => t.status === key).length);

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: phone ? 'nowrap' : 'wrap', flexShrink: 0 }}>
      {TABS.map(({ key, label }) => {
        const active = filterTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setFilterTab(key)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
              border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 44%, transparent)' : 'var(--border)'}`,
              background: active ? 'var(--accent-bg)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all .15s',
            }}
          >
            {label}
            <span style={{ fontSize: 10, fontWeight: 600, opacity: active ? 1 : 0.6 }}>{count(key)}</span>
          </button>
        );
      })}
    </div>
  );
}
