import { useMemo } from 'react';
import type { Task, TaskStatus } from '../../domain/task/task';
import { computeProgress, PROGRESS_PERIOD_LABEL, tasksInPeriod, type ProgressPeriod } from '../../domain/task/taskStats';
import { PanelRightIcon } from '../../shared/icons/Icons';
import { IconButton, ResizeHandle, SectionTitle, SegmentedControl } from '../../shared/ui';
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL_PLURAL } from '../../shared/presentation/taskPresentation';
import { useNow } from '../../shared/hooks/useNow';
import { PROGRESS_PANEL, useSettingsStore } from '../../store/settingsStore';
import { DonutChart } from './DonutChart';
import { StatRow, SummaryTile } from './StatRow';
import { UpcomingList } from './UpcomingList';

const STATUSES: TaskStatus[] = ['done', 'in_progress', 'waiting', 'todo'];
const PERIOD_OPTIONS = (['day', 'week', 'month', 'all'] as ProgressPeriod[]).map((p) => ({
  value: p,
  label: { day: 'Jour', week: 'Semaine', month: 'Mois', all: 'Tout' }[p],
  title: PROGRESS_PERIOD_LABEL[p],
}));

/**
 * Panneau "Progression" à droite de la page Tâches.
 * Largeur réglable à la souris (persistée), contenu qui se réorganise selon la largeur.
 */
export function ProgressPanel({ tasks, maxWidth, embedded = false }: {
  tasks: Task[];
  maxWidth: number;
  /** Téléphone : contenu seul (dans une fenêtre plein écran), sans poignée ni en-tête. */
  embedded?: boolean;
}) {
  const { progressPanelWidth, setProgressPanelWidth, progressPeriod, setProgressPeriod, setProgressPanelCollapsed } = useSettingsStore();
  const now = useNow();
  const width = embedded ? maxWidth : Math.max(PROGRESS_PANEL.min, Math.min(progressPanelWidth, maxWidth));
  const wide = width >= 420;

  const scoped = useMemo(() => tasksInPeriod(tasks, progressPeriod, now), [tasks, progressPeriod, now]);
  const stats = useMemo(() => computeProgress(scoped, now.getTime()), [scoped, now]);
  const priorityTotal = stats.activePriorities.high + stats.activePriorities.medium + stats.activePriorities.low;
  const donutSize = Math.round(Math.min(wide ? 170 : 150, width * 0.5));

  const content = (
      <div style={{ flex: 1, overflowY: embedded ? 'visible' : 'auto', padding: embedded ? '4px 0 8px' : '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: wide ? 20 : 16 }}>
          <DonutChart byStatus={stats.byStatus} total={stats.total} donePercent={stats.donePercent} size={donutSize} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', flex: 1 }}>
            {STATUSES.map((s) => (
              <StatRow key={s} label={STATUS_LABEL_PLURAL[s]} count={stats.byStatus[s]} total={stats.total} color={STATUS_COLOR[s]} />
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <SummaryTile label="Tâches" value={stats.total} />
          <SummaryTile label="Terminées" value={stats.byStatus.done} color="var(--success)" />
          <SummaryTile label="En retard" value={stats.overdue} color={stats.overdue ? 'var(--danger)' : undefined} />
        </div>

        {progressPeriod !== 'all' && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: -12 }}>
            Tâches dont l'échéance tombe {progressPeriod === 'day' ? "aujourd'hui" : progressPeriod === 'week' ? 'cette semaine' : 'ce mois-ci'}.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: width >= 520 ? '1fr 1fr' : '1fr', gap: 22 }}>
          {priorityTotal > 0 && (
            <section>
              <SectionTitle>Priorités actives</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['high', 'medium', 'low'] as const).map((p) => stats.activePriorities[p] > 0 && (
                  <StatRow key={p} label={PRIORITY_LABEL[p]} count={stats.activePriorities[p]} total={priorityTotal} color={PRIORITY_COLOR[p]} />
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionTitle>Échéances proches</SectionTitle>
            <UpcomingList tasks={stats.upcoming} />
          </section>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SegmentedControl size="sm" value={progressPeriod} onChange={setProgressPeriod} options={PERIOD_OPTIONS} />
        {content}
      </div>
    );
  }

  return (
    <aside style={{
      width, minWidth: width, position: 'relative', flexShrink: 0,
      borderLeft: '1px solid var(--border)', background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <ResizeHandle
        width={width}
        onResize={(w) => setProgressPanelWidth(Math.min(w, maxWidth), false)}
        onResizeEnd={(w) => setProgressPanelWidth(Math.min(w, maxWidth), true)}
        onDoubleClick={() => setProgressPanelWidth(PROGRESS_PANEL.default)}
      />

      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Progression</h2>
          <IconButton label="Masquer le panneau" variant="plain" size={26} onClick={() => setProgressPanelCollapsed(true)}>
            <PanelRightIcon size={15} />
          </IconButton>
        </div>
        <SegmentedControl size="sm" value={progressPeriod} onChange={setProgressPeriod} options={PERIOD_OPTIONS} />
      </div>

      {content}
    </aside>
  );
}
