import { useMemo } from 'react';
import { Select } from '../../../shared/ui';
import { useEventStore } from '../../../store/eventStore';

/** Lier une tâche à un évènement de l'agenda (évènements à venir + celui déjà lié). */
export function LinkedEventSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const events = useEventStore((s) => s.events);
  const options = useMemo(() => {
    const now = Date.now() - 86_400_000;
    return events
      .filter((e) => e.id === value || e.is_annual || new Date(e.start_at).getTime() >= now)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
      .slice(0, 200);
  }, [events, value]);

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Aucun —</option>
      {options.map((e) => (
        <option key={e.id} value={e.id}>
          {new Date(e.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {e.title}
        </option>
      ))}
    </Select>
  );
}
