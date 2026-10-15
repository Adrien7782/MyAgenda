import { useMemo, useState } from 'react';
import type { Task, TaskDraft, TaskStatus } from '../../domain/task/task';
import { isOverdue } from '../../domain/task/taskRules';
import { computeProgress, tasksInPeriod, type ProgressPeriod } from '../../domain/task/taskStats';
import { formatTime } from '../../domain/shared/date';
import { PlusIcon } from '../../shared/icons/Icons';
import { Dot, SegmentedControl, StatusCheck } from '../../shared/ui';
import { STATUS_COLOR, STATUS_LABEL_PLURAL } from '../../shared/presentation/taskPresentation';
import { useElementWidth } from '../../shared/hooks/useElementWidth';
import { useNow } from '../../shared/hooks/useNow';
import { useActiveTasks, useTaskStore } from '../../store/taskStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';
import { DonutChart } from '../progress/DonutChart';

const STATUSES: TaskStatus[] = ['done', 'in_progress', 'waiting', 'todo'];
const PERIODS = [
  { value: 'day' as const, label: 'Jour' },
  { value: 'week' as const, label: 'Semaine' },
  { value: 'all' as const, label: 'Tout' },
];

/** Échéance d'une tâche ajoutée rapidement : fin de journée (jour), fin de semaine (semaine), aucune (tout). */
function quickDeadline(period: ProgressPeriod, now: Date): string | undefined {
  if (period === 'all') return undefined;
  const d = new Date(now);
  if (period === 'week') d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

function sortForFocus(a: Task, b: Task): number {
  const rank = (t: Task) => (t.status === 'done' ? 2 : isOverdue(t) ? 0 : 1);
  return rank(a) - rank(b) || (a.deadline ?? '9').localeCompare(b.deadline ?? '9');
}

/**
 * Tableau de bord compact : camembert de progression + objectifs de la période + ajout rapide.
 * S'adapte à la taille de la fenêtre (colonne si étroit, deux colonnes si large).
 */
export function MiniDashboard() {
  const tasks = useActiveTasks();
  const setStatus = useTaskStore((s) => s.setStatus);
  const saveDraft = useTaskStore((s) => s.saveDraft);
  const openTaskModal = useUiStore((s) => s.openTaskModal);
  const period = useSettingsStore((s) => s.miniPeriod);
  const setPeriod = useSettingsStore((s) => s.setMiniPeriod);
  const now = useNow();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [title, setTitle] = useState('');
  const wide = width >= 480;

  const scoped = useMemo(() => tasksInPeriod(tasks, period, now), [tasks, period, now]);
  const stats = useMemo(() => computeProgress(scoped, now.getTime()), [scoped, now]);
  // La liste montre aussi les retards (même hors période) : ce sont des objectifs à rattraper.
  const list = useMemo(() => {
    const ids = new Set(scoped.map((t) => t.id));
    const overdue = period === 'all' ? [] : tasks.filter((t) => !ids.has(t.id) && isOverdue(t, now.getTime()));
    return [...scoped, ...overdue].sort(sortForFocus);
  }, [scoped, tasks, period, now]);

  const donut = Math.round(Math.max(90, Math.min(wide ? 170 : 150, (wide ? width * 0.36 : width * 0.45))));

  async function add(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !title.trim()) return;
    const draft: TaskDraft = {
      title: title.trim(), status: 'todo', tags: [], recurrence: 'none', subtasks: [], newAttachments: [], removedAttachmentIds: [],
      deadline: quickDeadline(period, now),
    };
    await saveDraft(null, draft);
    setTitle('');
  }

  return (
    <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)', minHeight: 0 }}>
      <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <SegmentedControl size="sm" value={period} onChange={setPeriod} options={PERIODS} />
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <b style={{ color: 'var(--text)' }}>{stats.byStatus.done}</b>/{stats.total} faites
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: wide ? 'row' : 'column', overflow: wide ? 'hidden' : 'auto' }}>
        {/* Camembert + légende */}
        <div style={{
          display: 'flex', flexDirection: wide ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
          padding: '14px 12px', flexShrink: 0, borderRight: wide ? '1px solid var(--border)' : 'none',
          borderBottom: wide ? 'none' : '1px solid var(--border)', width: wide ? Math.max(200, donut + 40) : undefined,
        }}>
          <DonutChart byStatus={stats.byStatus} total={stats.total} donePercent={stats.donePercent} size={donut} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            {STATUSES.map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-xs)' }}>
                <Dot color={STATUS_COLOR[s]} size={7} />
                <span style={{ color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap' }}>{STATUS_LABEL_PLURAL[s]}</span>
                <b style={{ fontWeight: 600, marginLeft: 8 }}>{stats.byStatus[s]}</b>
              </div>
            ))}
            {stats.overdue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>
                <Dot color="var(--danger)" size={7} glow /> <span style={{ flex: 1 }}>En retard</span> <b>{stats.overdue}</b>
              </div>
            )}
          </div>
        </div>

        {/* Objectifs */}
        <div style={{ flex: 1, minHeight: wide ? 0 : 120, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', paddingTop: 16 }}>
              Rien de prévu {period === 'day' ? "aujourd'hui" : period === 'week' ? 'cette semaine' : ''} — ajoute un objectif ci-dessous.
            </div>
          )}
          {list.map((t) => {
            const done = t.status === 'done';
            const late = isOverdue(t, now.getTime());
            return (
              <div key={t.id} onDoubleClick={() => openTaskModal({ taskId: t.id })} title="Double-clic pour modifier"
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 6px', borderRadius: 8, background: late ? 'var(--danger-bg)' : 'transparent' }}>
                <StatusCheck size={16} color={done ? 'var(--success)' : STATUS_COLOR[t.status]} done={done}
                  title={done ? 'Rouvrir' : 'Terminer'} onClick={() => setStatus(t.id, done ? 'todo' : 'done')} />
                <span style={{
                  flex: 1, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: done ? 'var(--text-muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none',
                }}>{t.title}</span>
                {t.deadline && (
                  <span style={{ fontSize: 10, color: late ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(t.deadline).toDateString() === now.toDateString() ? formatTime(t.deadline) : new Date(t.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        margin: '8px 12px 12px', height: 36, background: 'var(--surface-el)', border: '1px solid var(--border)', borderRadius: 9,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, flexShrink: 0,
      }}>
        <PlusIcon size={15} color="var(--accent)" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={add}
          placeholder={period === 'day' ? "Objectif pour aujourd'hui…" : period === 'week' ? 'Objectif de la semaine…' : 'Ajouter une tâche…'}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 'var(--text-sm)' }} />
      </div>
    </div>
  );
}
