import { create } from 'zustand';
import type { TaskStatus } from '../domain/task/task';

export type TaskView = 'list' | 'kanban';
export type FilterTab = 'all' | TaskStatus;

interface TaskModalState {
  open: boolean;
  editingId: string | null;
  prefillDeadline: string | null;
}

interface EventModalState {
  open: boolean;
  editingId: string | null;
  /** Début pré-rempli (ISO) pour une création. */
  defaultStart: string | null;
}

/** État d'interface éphémère (non persisté). */
interface UiState {
  taskView: TaskView;
  filterTab: FilterTab;
  searchQuery: string;
  taskModal: TaskModalState;
  eventModal: EventModalState;
  isMiniOpen: boolean;
  setTaskView(v: TaskView): void;
  setFilterTab(t: FilterTab): void;
  setSearchQuery(q: string): void;
  openTaskModal(opts?: { taskId?: string; prefillDeadline?: string }): void;
  closeTaskModal(): void;
  openEventModal(opts?: { eventId?: string; defaultStart?: string }): void;
  closeEventModal(): void;
  setMiniOpen(v: boolean): void;
}

export const useUiStore = create<UiState>((set) => ({
  taskView: 'list',
  filterTab: 'all',
  searchQuery: '',
  taskModal: { open: false, editingId: null, prefillDeadline: null },
  eventModal: { open: false, editingId: null, defaultStart: null },
  isMiniOpen: false,
  setTaskView: (taskView) => set({ taskView }),
  setFilterTab: (filterTab) => set({ filterTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  openTaskModal: (opts) =>
    set({ taskModal: { open: true, editingId: opts?.taskId ?? null, prefillDeadline: opts?.prefillDeadline ?? null } }),
  closeTaskModal: () => set({ taskModal: { open: false, editingId: null, prefillDeadline: null } }),
  openEventModal: (opts) =>
    set({ eventModal: { open: true, editingId: opts?.eventId ?? null, defaultStart: opts?.defaultStart ?? null } }),
  closeEventModal: () => set({ eventModal: { open: false, editingId: null, defaultStart: null } }),
  setMiniOpen: (isMiniOpen) => set({ isMiniOpen }),
}));
