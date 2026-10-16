import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import type { Task, TaskStatus } from '../../domain/task/task';
import { TASK_STATUSES } from '../../domain/task/task';
import { STATUS_COLOR, STATUS_LABEL_PLURAL } from '../../shared/presentation/taskPresentation';
import { Dot } from '../../shared/ui';
import { useTaskStore } from '../../store/taskStore';
import { usePhoneLayout } from '../../shared/hooks/usePhoneLayout';
import { TaskCard, type TaskCardActions } from './TaskCard';
import { useTaskCardActions } from './useTaskCardActions';

type CardActions = Omit<TaskCardActions, 'onShowOverdueActions'>;

/**
 * Seules les colonnes sont des zones de dépôt : la cible est la colonne sous le pointeur,
 * peu importe le nombre de cartes qu'elle contient. Repli sur l'intersection des rectangles
 * si le pointeur est entre deux colonnes.
 */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/** Vue Kanban : glisser une carte (n'importe où sur la carte) dans une colonne change son statut. */
export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const setStatus = useTaskStore((s) => s.setStatus);
  const actions = useTaskCardActions();
  const sensors = useSensors(
    // Souris : 6 px de mouvement avant de démarrer, un simple clic (case, badge, double-clic) reste un clic.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Doigt : appui maintenu 250 ms pour attraper une carte ; un glissement rapide fait défiler.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const activeTask = tasks.find((t) => t.id === activeId) ?? null;
  const phone = usePhoneLayout();

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const target = e.over?.data.current?.status as TaskStatus | undefined;
    const task = tasks.find((t) => t.id === e.active.id);
    // Statut changé (optimiste) AVANT de masquer l'aperçu : la carte apparaît directement à destination.
    if (task && target && task.status !== target) void setStatus(task.id, target);
    setActiveId(null);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div style={{ display: 'flex', gap: 12, minHeight: '100%', overflowX: 'auto', padding: '4px 2px', scrollSnapType: phone ? 'x mandatory' : undefined }}>
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            actions={actions}
            dragging={activeTask}
          />
        ))}
      </div>
      {/* Pas d'animation de "retour" : la carte est déjà dans sa nouvelle colonne au moment du dépôt. */}
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div style={{ transform: 'rotate(1.5deg)', cursor: 'grabbing' }}>
            <TaskCard task={activeTask} {...actions} isDragging compact />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ status, tasks, actions, dragging }: {
  status: TaskStatus;
  tasks: Task[];
  actions: CardActions;
  dragging: Task | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `col-${status}`, data: { status } });
  const phone = usePhoneLayout();
  const color = STATUS_COLOR[status];
  const isSource = dragging?.status === status;
  // Pendant un glisser, les 4 zones sont en surbrillance ; celle survolée encore plus.
  const highlighted = !!dragging && !isSource;

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: phone ? '82%' : 190, flex: 1, scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 12, padding: 6,
        background: isOver
          ? `color-mix(in srgb, ${color} 16%, var(--surface))`
          : highlighted ? `color-mix(in srgb, ${color} 6%, transparent)` : 'transparent',
        border: `${isOver ? 2 : 1.5}px ${dragging ? 'dashed' : 'solid'} ${
          isOver ? color : highlighted ? `color-mix(in srgb, ${color} 55%, transparent)` : 'transparent'
        }`,
        boxShadow: isOver ? `0 0 0 4px color-mix(in srgb, ${color} 14%, transparent), 0 0 24px color-mix(in srgb, ${color} 22%, transparent)` : 'none',
        transition: 'background .12s, border-color .12s, box-shadow .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Dot color={color} size={8} />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{STATUS_LABEL_PLURAL[status]}</span>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--surface-el)', borderRadius: 10, padding: '1px 7px' }}>
          {tasks.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {tasks.map((t) => <DraggableTaskCard key={t.id} task={t} actions={actions} />)}
        {(tasks.length === 0 || highlighted) && (
          <div style={{
            padding: '18px 12px', textAlign: 'center', fontSize: 'var(--text-xs)', borderRadius: 9,
            color: highlighted ? color : 'var(--text-muted)',
            border: `1px dashed ${highlighted ? `color-mix(in srgb, ${color} 50%, transparent)` : 'var(--border)'}`,
            flex: highlighted ? 1 : undefined, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {highlighted ? `Déposer ici → ${STATUS_LABEL_PLURAL[status]}` : 'Aucune tâche'}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task, actions }: { task: Task; actions: CardActions }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none' }}
    >
      <TaskCard task={task} {...actions} compact />
    </div>
  );
}
