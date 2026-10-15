import { useEffect, useRef, useState } from 'react';
import type { CalendarEvent, EventDraft } from '../../domain/event/event';
import { isAllDay } from '../../domain/event/eventRules';
import { colorForTitle, eventColorKey, PASTEL_PALETTE } from '../../domain/event/eventColors';
import { fromLocalInputValue, startOfDay, toLocalInputValue } from '../../domain/shared/date';
import { TrashIcon } from '../../shared/icons/Icons';
import { Button, ColorPicker, Field, FieldRow, Modal, TextArea, TextInput, Toggle } from '../../shared/ui';
import { readReminder, writeReminder, type ReminderSetting } from '../../domain/reminder/reminder';
import { nextOccurrenceStart } from '../../domain/event/eventRules';
import { ReminderField } from '../reminders/ReminderField';
import { useEventStore } from '../../store/eventStore';
import { useUiStore } from '../../store/uiStore';

const DURATIONS = [15, 30, 60, 90, 120, 180];

/** Modale unique de création / modification d'évènement (montée une fois dans AppLayout). */
export function EventModal() {
  const { open, editingId, defaultStart } = useUiStore((s) => s.eventModal);
  const close = useUiStore((s) => s.closeEventModal);
  const event = useEventStore((s) => (editingId ? s.events.find((e) => e.id === editingId) ?? null : null));
  if (!open) return null;
  return <EventModalContent key={editingId ?? `new-${defaultStart}`} event={event} defaultStart={defaultStart} onClose={close} />;
}

function defaultStartIso(defaultStart: string | null): string {
  if (defaultStart) return defaultStart;
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toISOString();
}

function EventModalContent({ event, defaultStart, onClose }: { event: CalendarEvent | null; defaultStart: string | null; onClose: () => void }) {
  const save = useEventStore((s) => s.save);
  const remove = useEventStore((s) => s.remove);
  const source = useEventStore((s) => (event?.source_id ? s.sources.find((x) => x.id === event.source_id) : undefined));
  const titleColors = useEventStore((s) => s.titleColors);
  const setTitleColor = useEventStore((s) => s.setTitleColor);
  const allEvents = useEventStore((s) => s.events);

  const [title, setTitle] = useState(event?.title ?? '');
  const [startAt, setStartAt] = useState(toLocalInputValue(event?.start_at ?? defaultStartIso(defaultStart)));
  const [allDay, setAllDay] = useState(event ? isAllDay(event) : false);
  const [duration, setDuration] = useState(event && !isAllDay(event) ? event.duration_min : 60);
  const [days, setDays] = useState(event && isAllDay(event) ? event.duration_min / 1440 : 1);
  const [location, setLocation] = useState(event?.location ?? '');
  const [participants, setParticipants] = useState(event?.participants ?? '');
  const [comment, setComment] = useState(event?.comment ?? '');
  const [annual, setAnnual] = useState(event?.is_annual === 1);
  const [reminder, setReminder] = useState<ReminderSetting>(event ? readReminder(event) : { kind: 'none' });
  const [color, setColor] = useState<string | null>(event ? colorForTitle(titleColors, event.title) ?? null : null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 30); }, []);

  const valid = title.trim().length > 0 && !!fromLocalInputValue(startAt);

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      let start = fromLocalInputValue(startAt)!;
      if (allDay) start = startOfDay(new Date(start)).toISOString();
      const draft: EventDraft = {
        title: title.trim(),
        start_at: start,
        duration_min: allDay ? Math.max(1, days) * 1440 : Math.max(5, duration),
        location: location.trim() || undefined,
        participants: participants.trim() || undefined,
        comment: comment.trim() || undefined,
        is_annual: annual ? 1 : 0,
        ...writeReminder(reminder),
      };
      await save(event?.id ?? null, draft);
      // La couleur s'applique au titre : tous les évènements identiques la partagent.
      if (color !== (colorForTitle(titleColors, draft.title) ?? null)) await setTitleColor(draft.title, color);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    await remove(event.id);
    onClose();
  }

  return (
    <Modal
      title={event ? "Modifier l'évènement" : 'Nouvel évènement'}
      onClose={onClose}
      onSubmit={submit}
      width={520}
      footer={
        <>
          {event && (
            <Button variant="danger" icon={<TrashIcon size={13} />} onClick={handleDelete} style={{ marginRight: 'auto' }}>
              Supprimer
            </Button>
          )}
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={submit} disabled={!valid || saving}>
            {saving ? 'Enregistrement…' : event ? 'Enregistrer' : 'Créer'}
          </Button>
        </>
      }
    >
      {source && (
        <div style={{ padding: '9px 12px', borderRadius: 9, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--surface-el)', borderLeft: `3px solid ${source.color}` }}>
          Importé depuis <b style={{ color: 'var(--text)' }}>{source.name}</b>. Tes modifications seront remplacées à la prochaine actualisation de ce calendrier.
        </div>
      )}
      <Field label="Titre" required>
        <TextInput ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de l'évènement…"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }} />
      </Field>
      <Field
        label="Couleur"
        hint={title.trim() ? sameTitleHint(allEvents.filter((e) => eventColorKey(e.title) === eventColorKey(title)).length + (event ? 0 : 1), title.trim()) : undefined}
      >
        <ColorPicker
          value={color}
          onChange={setColor}
          palette={PASTEL_PALETTE}
          defaultColor={event?.is_annual || annual ? 'var(--warn)' : source?.color ?? 'var(--accent)'}
          defaultLabel={source ? `Couleur de « ${source.name} »` : 'Couleur du thème'}
        />
      </Field>
      <FieldRow>
        <Field label={allDay ? 'Date' : 'Date et heure'} required>
          <TextInput type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </Field>
        <Field label="Lieu">
          <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle, adresse…" />
        </Field>
      </FieldRow>
      <Field label="Durée" required>
        {allDay ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TextInput type="number" min={1} max={60} value={days} onChange={(e) => setDays(parseInt(e.target.value) || 1)} style={{ width: 80, textAlign: 'center' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>jour(s)</span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {DURATIONS.map((min) => (
              <button key={min} type="button" onClick={() => setDuration(min)} style={{
                flex: 1, minWidth: 44, padding: '7px 0', borderRadius: 8, fontSize: 'var(--text-xs)', fontWeight: duration === min ? 600 : 400,
                border: `1px solid ${duration === min ? 'color-mix(in srgb, var(--accent) 44%, transparent)' : 'var(--border)'}`,
                background: duration === min ? 'var(--accent-bg)' : 'var(--surface-el)', color: duration === min ? 'var(--accent)' : 'var(--text-muted)',
              }}>{min < 60 ? `${min} min` : `${min / 60} h`}</button>
            ))}
            <TextInput type="number" min={5} max={1440} value={duration} title="Durée en minutes"
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)} style={{ width: 76, textAlign: 'center' }} />
          </div>
        )}
      </Field>
      <ReminderField
        value={reminder}
        onChange={setReminder}
        due={(() => {
          const iso = fromLocalInputValue(startAt);
          if (!iso) return null;
          // Pour un anniversaire, le délai s'applique à la prochaine occurrence.
          return nextOccurrenceStart({ id: '', title, start_at: iso, duration_min: duration, is_annual: annual ? 1 : 0, created_at: '', updated_at: '' });
        })()}
        dueLabel="le début"
      />
      <Field label="Participants">
        <TextInput value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Noms séparés par des virgules" />
      </Field>
      <Field label="Notes">
        <TextArea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Description…" />
      </Field>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          <Toggle checked={allDay} onChange={setAllDay} label="Journée entière" /> Journée entière
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          <Toggle checked={annual} onChange={setAnnual} color="var(--warn)" label="Annuel" /> Chaque année (anniversaire, fête…)
        </label>
      </div>
    </Modal>
  );
}

function sameTitleHint(count: number, title: string): string {
  return count > 1
    ? `Appliquée aux ${count} évènements « ${title} ».`
    : `Appliquée à tous les évènements nommés « ${title} ».`;
}
