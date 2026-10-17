import { useMemo } from 'react';
import { Select } from '../../../shared/ui';
import { useEventStore } from '../../../store/eventStore';
import { isRecurring, nextOccurrenceStart } from '../../../domain/event/eventRules';

/** Lier une tâche à un évènement de l'agenda (évènements à venir + celui déjà lié). */
export function LinkedEventSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const events = useEventStore((s) => s.events);
  const options = useMemo(() => {
    const now = Date.now() - 86_400_000;
    return events
      .filter((e) => e.id === value || nextOccurrenceStart(e).getTime() >= now)
      .sort((a, b) => nextOccurrenceStart(a).getTime() - nextOccurrenceStart(b).getTime())
      .slice(0, 200);
  }, [events, value]);

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Aucun —</option>
      {options.map((e) => (
        <option key={e.id} value={e.id}>
          {nextOccurrenceStart(e).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {e.title}{isRecurring(e) ? ' ↻' : ''}
        </option>
      ))}
    </Select>
  );
}
