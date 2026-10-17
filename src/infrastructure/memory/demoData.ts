import type { Note } from '../../domain/note/note';
import type { Task } from '../../domain/task/task';
import type { CalendarEvent } from '../../domain/event/event';
import { addDays, DAY_MS } from '../../domain/shared/date';

/** Données de démonstration pour le mode navigateur. */
export function demoTasks(): Task[] {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const created = (i: number) => new Date(now - i * 1000).toISOString();
  const base = { is_deleted: 0, recurrence: 'none' as const, updated_at: iso(0) };
  return [
    {
      ...base, id: 'demo-1', title: 'Configurer Tauri v2 + React', comment: 'Installer Rust, puis lancer npm run tauri dev',
      deadline: iso(2 * DAY_MS), status: 'in_progress', priority: 'high', tags: '["tauri","setup"]', created_at: created(1),
      subtasks: [
        { id: 'st-1', task_id: 'demo-1', title: 'Installer Rust', is_done: 1, position: 0, created_at: created(1) },
        { id: 'st-2', task_id: 'demo-1', title: 'npm run tauri dev', is_done: 0, position: 1, created_at: created(1) },
      ],
    },
    { ...base, id: 'demo-2', title: 'Implémenter le système de thèmes', comment: '5 thèmes via variables CSS', status: 'done', priority: 'medium', tags: '["ui","design"]', deadline: iso(-3 * 3600_000), created_at: created(2), subtasks: [] },
    { ...base, id: 'demo-3', title: 'Créer les composants de layout', status: 'done', created_at: created(3), subtasks: [] },
    { ...base, id: 'demo-4', title: 'Synchronisation Supabase offline-first', comment: 'Résolution des conflits via updated_at', deadline: iso(-3600_000), status: 'todo', priority: 'high', tags: '["backend","sync"]', created_at: created(4), subtasks: [] },
    { ...base, id: 'demo-5', title: 'Mode Mini (always-on-top)', comment: 'Widget 300×260 avec ajout rapide', status: 'waiting', priority: 'low', created_at: created(5), subtasks: [] },
    { ...base, id: 'demo-6', title: 'Notifications desktop (deadline + snooze)', deadline: iso(3 * DAY_MS), status: 'todo', priority: 'medium', created_at: created(6), subtasks: [] },
    { ...base, id: 'demo-7', title: 'Réviser le partiel de réseaux', deadline: iso(5 * 3600_000), status: 'todo', priority: 'high', created_at: created(7), subtasks: [] },
    { ...base, id: 'demo-8', title: 'Ancienne tâche supprimée', status: 'todo', is_deleted: 1, created_at: created(8), subtasks: [] },
  ];
}

export function demoEvents(): CalendarEvent[] {
  const today = new Date();
  const at = (days: number, h: number, m = 0) =>
    addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m), days).toISOString();
  const stamp = today.toISOString();
  const base = { is_annual: 0, created_at: stamp, updated_at: stamp };
  return [
    { ...base, id: 'ev-1', title: 'Point équipe', start_at: at(0, 10), duration_min: 60, comment: 'Sync hebdomadaire' },
    { ...base, id: 'ev-2', title: 'Review design', start_at: at(2, 14, 30), duration_min: 90 },
    { ...base, id: 'ev-3', title: 'Anniversaire de Léa', start_at: at(5, 9), duration_min: 30, is_annual: 1 },
    { ...base, id: 'ev-4', title: 'Sport', start_at: at(0, 10, 30), duration_min: 60, location: 'Gymnase' },
  ];
}

export function demoNotes(): Note[] {
  const at = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  return [
    {
      id: 'note-1', title: 'Idées de cadeaux', color: '#F2AFCF', is_pinned: 1, is_deleted: 0, created_at: at(80), updated_at: at(2),
      content: '<p>Pour l\'anniversaire de <strong>Léa</strong> :</p><ul><li><p>Un livre sur les volcans</p></li><li><p>Une plante grasse</p></li></ul>',
    },
    {
      id: 'note-2', title: 'Courses', color: null, is_pinned: 0, is_deleted: 0, created_at: at(30), updated_at: at(5),
      content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Pain</p></li><li data-type="taskItem" data-checked="false"><p>Lait</p></li><li data-type="taskItem" data-checked="false"><p>Café</p></li></ul>',
    },
  ];
}
