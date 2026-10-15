import type { Task } from '../../domain/task/task';
import { KanbanIcon, ListIcon, PanelRightIcon, PlusIcon } from '../../shared/icons/Icons';
import { Button, IconButton, PageHeader, SearchInput, SegmentedControl } from '../../shared/ui';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore, type TaskView } from '../../store/uiStore';
import { FilterTabs } from './FilterTabs';

export function TasksToolbar({ tasks }: { tasks: Task[] }) {
  const { searchQuery, setSearchQuery, taskView, setTaskView, openTaskModal } = useUiStore();
  const collapsed = useSettingsStore((s) => s.progressPanelCollapsed);
  const setCollapsed = useSettingsStore((s) => s.setProgressPanelCollapsed);

  return (
    <PageHeader
      title="Tâches"
      actions={
        <>
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
          <Button variant="primary" icon={<PlusIcon size={15} />} onClick={() => openTaskModal()}>Nouvelle tâche</Button>
        </>
      }
    >
      {taskView === 'list' ? <FilterTabs tasks={tasks} /> : <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Glisse une carte vers une autre colonne pour changer son statut.</span>}
      <div style={{ flex: 1 }} />
      <SegmentedControl<TaskView>
        size="sm"
        value={taskView}
        onChange={setTaskView}
        options={[
          { value: 'list', label: <><ListIcon size={14} /> Liste</>, title: 'Vue liste' },
          { value: 'kanban', label: <><KanbanIcon size={14} /> Kanban</>, title: 'Vue Kanban' },
        ]}
      />
      {collapsed && (
        <IconButton label="Afficher la progression" size={28} onClick={() => setCollapsed(false)}>
          <PanelRightIcon size={14} />
        </IconButton>
      )}
    </PageHeader>
  );
}
