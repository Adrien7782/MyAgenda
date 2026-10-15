import { useEffect, useRef, useState } from 'react';
import type { Task } from '../../../domain/task/task';
import { Button, Field, FieldRow, Modal, OptionGroup, TextArea, TextInput } from '../../../shared/ui';
import { PRIORITY_OPTIONS, RECURRENCE_OPTIONS, STATUS_OPTIONS } from '../../../shared/presentation/taskPresentation';
import { useTaskStore } from '../../../store/taskStore';
import { useUiStore } from '../../../store/uiStore';
import { useTaskForm } from './useTaskForm';
import { SubtaskEditor } from './SubtaskEditor';
import { AttachmentEditor } from './AttachmentEditor';
import { LinkedEventSelect } from './LinkedEventSelect';
import { useEventStore } from '../../../store/eventStore';
import { deadlineFromEvent } from '../../../domain/task/taskRules';
import { fromLocalInputValue, toLocalInputValue } from '../../../domain/shared/date';
import { ReminderField } from '../../reminders/ReminderField';

/** Modale unique de création / modification de tâche (montée une fois dans AppLayout). */
export function TaskModal() {
  const { open, editingId, prefillDeadline } = useUiStore((s) => s.taskModal);
  const close = useUiStore((s) => s.closeTaskModal);
  const task = useTaskStore((s) => (editingId ? s.tasks.find((t) => t.id === editingId) ?? null : null));
  if (!open) return null;
  return <TaskModalContent key={editingId ?? 'new'} task={task} prefillDeadline={prefillDeadline} onClose={close} />;
}

function TaskModalContent({ task, prefillDeadline, onClose }: {
  task: Task | null;
  prefillDeadline: string | null;
  onClose: () => void;
}) {
  const saveDraft = useTaskStore((s) => s.saveDraft);
  const form = useTaskForm(task, prefillDeadline);
  const { fields, set } = form;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const linkedEvent = useEventStore((s) => (fields.eventId ? s.events.find((e) => e.id === fields.eventId) : undefined));
  const linkedDeadline = linkedEvent ? deadlineFromEvent(linkedEvent) : null;

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 30); }, []);

  // Tâche liée à un évènement → l'échéance est le début de l'évènement (pas d'horaire à saisir).
  useEffect(() => {
    if (linkedDeadline) set.setDeadline(toLocalInputValue(linkedDeadline));
  }, [linkedDeadline]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form.isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await saveDraft(task?.id ?? null, form.toDraft());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={task ? 'Modifier la tâche' : 'Nouvelle tâche'}
      onClose={onClose}
      onSubmit={save}
      width={560}
      footer={
        <>
          {error && <span style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', marginRight: 'auto' }}>{error}</span>}
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={save} disabled={!form.isValid || saving}>
            {saving ? 'Enregistrement…' : task ? 'Enregistrer' : 'Créer la tâche'}
          </Button>
        </>
      }
    >
      <Field label="Titre" required>
        <TextInput ref={titleRef} value={fields.title} onChange={(e) => set.setTitle(e.target.value)} placeholder="Nom de la tâche…"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }} />
      </Field>
      <Field label="Commentaire">
        <TextArea rows={2} value={fields.comment} onChange={(e) => set.setComment(e.target.value)} placeholder="Notes, contexte…" />
      </Field>
      <FieldRow>
        <Field label="Évènement lié" hint={linkedEvent ? 'L’échéance suit automatiquement le début de l’évènement.' : undefined}>
          <LinkedEventSelect value={fields.eventId} onChange={set.setEventId} />
        </Field>
        <Field label="Échéance">
          <TextInput
            type="datetime-local"
            value={fields.deadline}
            onChange={(e) => set.setDeadline(e.target.value)}
            disabled={!!linkedEvent}
            title={linkedEvent ? `Début de « ${linkedEvent.title} »` : undefined}
            style={linkedEvent ? { opacity: 0.75, cursor: 'not-allowed' } : undefined}
          />
        </Field>
      </FieldRow>
      <ReminderField
        value={fields.reminder}
        onChange={set.setReminder}
        due={fields.deadline && fromLocalInputValue(fields.deadline) ? new Date(fromLocalInputValue(fields.deadline)!) : null}
        dueLabel="l'échéance"
      />
      <FieldRow>
        <Field label="Statut">
          <OptionGroup options={STATUS_OPTIONS} value={fields.status} onChange={set.setStatus} />
        </Field>
        <Field label="Priorité">
          <OptionGroup options={PRIORITY_OPTIONS} value={fields.priority} onChange={set.setPriority} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Labels">
          <TextInput value={fields.tags} onChange={(e) => set.setTags(e.target.value)} placeholder="cours, urgent… (virgules)" />
        </Field>
        <Field label="Récurrence">
          <OptionGroup options={RECURRENCE_OPTIONS} value={fields.recurrence} onChange={set.setRecurrence} />
        </Field>
      </FieldRow>
      <Field label="Sous-tâches">
        <SubtaskEditor value={form.subtasks} onChange={form.setSubtasks} />
      </Field>
      <Field label="Pièces jointes">
        <AttachmentEditor attachments={form.attachments} />
      </Field>
    </Modal>
  );
}
