import { useState } from 'react';
import type { Task } from '../../domain/task/task';
import { KanbanIcon, ListIcon, PanelRightIcon, PieChartIcon, PlusIcon, SearchIcon } from '../../shared/icons/Icons';
import { Button, IconButton, Modal, PageHeader, SearchInput, SegmentedControl } from '../../shared/ui';
import { usePhoneLayout } from '../../shared/hooks/usePhoneLayout';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore, type TaskView } from '../../store/uiStore';
import { ProgressPanel } from '../progress/ProgressPanel';
import { FilterTabs } from './FilterTabs';

const VIEW_OPTIONS = (phone: boolean) => [
  { value: 'list' as const, label: <><ListIcon size={14} />{!phone && ' Liste'}</>, title: 'Vue liste' },
  { value: 'kanban' as const, label: <><KanbanIcon size={14} />{!phone && ' Kanban'}</>, title: 'Vue Kanban' },
];

export function TasksToolbar({ tasks }: { tasks: Task[] }) {
  const { searchQuery, setSearchQuery, taskView, setTaskView, openTaskModal } = useUiStore();
  const collapsed = useSettingsStore((s) => s.progressPanelCollapsed);
  const setCollapsed = useSettingsStore((s) => s.setProgressPanelCollapsed);
  const phone = usePhoneLayout();
  const [searchOpen, setSearchOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  if (phone) {
    // Téléphone : actions en icônes, recherche dépliable, progression dans une fenêtre, « + » flottant.
    return (
      <>
        <PageHeader
          title="Tâches"
          actions={
            <>
              <IconButton label="Rechercher" size={36} onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearchQuery(''); }}>
                <SearchIcon size={17} />
              </IconButton>
              <IconButton label="Progression" size={36} onClick={() => setProgressOpen(true)}><PieChartIcon size={17} /></IconButton>
              <SegmentedControl<TaskView> size="sm" value={taskView} onChange={setTaskView} options={VIEW_OPTIONS(true)} />
            </>
          }
        >
          {searchOpen ? (
            <div style={{ flex: 1, display: 'flex' }}><SearchInput value={searchQuery} onChange={setSearchQuery} width={10000} /></div>
          ) : taskView === 'list' ? (
            <FilterTabs tasks={tasks} />
          ) : (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Maintiens une carte puis glisse-la vers une autre colonne.</span>
          )}
        </PageHeader>
        {progressOpen && (
          <Modal title="Progression" onClose={() => setProgressOpen(false)}>
            <ProgressPanel tasks={tasks} maxWidth={Math.min(window.innerWidth, 640) - 32} embedded />
          </Modal>
        )}
        <button type="button" className="fab" aria-label="Nouvelle tâche" onClick={() => openTaskModal()}>
          <PlusIcon size={24} />
        </button>
      </>
    );
  }

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
      <SegmentedControl<TaskView> size="sm" value={taskView} onChange={setTaskView} options={VIEW_OPTIONS(false)} />
      {collapsed && (
        <IconButton label="Afficher la progression" size={28} onClick={() => setCollapsed(false)}>
          <PanelRightIcon size={14} />
        </IconButton>
      )}
    </PageHeader>
  );
}
