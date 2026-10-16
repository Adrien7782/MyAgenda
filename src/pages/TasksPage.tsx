import { useMemo } from 'react';
import { matchesSearch } from '../domain/task/taskRules';
import { useElementWidth } from '../shared/hooks/useElementWidth';
import { useSettingsStore } from '../store/settingsStore';
import { useActiveTasks } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { TasksToolbar } from '../widgets/tasks/TasksToolbar';
import { TaskList } from '../widgets/tasks/TaskList';
import { KanbanBoard } from '../widgets/tasks/KanbanBoard';
import { ProgressPanel } from '../widgets/progress/ProgressPanel';
import { usePhoneLayout } from '../shared/hooks/usePhoneLayout';

/** En dessous de cette largeur, la liste a besoin de toute la place : le panneau se replie. */
const MIN_LIST_WIDTH = 420;

export function TasksPage() {
  const tasks = useActiveTasks();
  const { filterTab, searchQuery, taskView } = useUiStore();
  const collapsed = useSettingsStore((s) => s.progressPanelCollapsed);
  const [pageRef, pageWidth] = useElementWidth<HTMLDivElement>();
  const phone = usePhoneLayout();

  const searched = useMemo(() => tasks.filter((t) => matchesSearch(t, searchQuery)), [tasks, searchQuery]);
  const visible = useMemo(
    () => (filterTab === 'all' ? searched : searched.filter((t) => t.status === filterTab)),
    [searched, filterTab],
  );

  const panelMax = Math.max(0, pageWidth - MIN_LIST_WIDTH);
  const showPanel = !phone && !collapsed && pageWidth > 0 && panelMax >= 260;

  return (
    <div ref={pageRef} style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <div className="dot-grid" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <TasksToolbar tasks={tasks} />
        <div style={{ flex: 1, overflowY: 'auto', padding: phone ? '12px 12px 84px' : '16px 20px' }}>
          {taskView === 'kanban' && !phone ? <KanbanBoard tasks={searched} /> : <TaskList tasks={visible} />}
        </div>
      </div>
      {showPanel && <ProgressPanel tasks={tasks} maxWidth={panelMax} />}
    </div>
  );
}
