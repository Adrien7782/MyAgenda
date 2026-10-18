import { useState, type ReactNode } from 'react';
import { MAX_RECURRENCE_INTERVAL, normalizeInterval, recurrenceText, UNIT_PLURAL, type RecurrenceUnit } from '../../domain/shared/recurrence';
import { Field, OptionGroup, Select, TextInput, type Option } from '../../shared/ui';

const PRESET_LABEL: Record<RecurrenceUnit, string> = { daily: 'Quotidien', weekly: 'Hebdo', monthly: 'Mensuel', yearly: 'Annuel' };

type Choice<U extends RecurrenceUnit> = U | 'none' | 'custom';

/**
 * Choix de la répétition d'une tâche ou d'un évènement : aucune, chaque jour / semaine / mois (/ année),
 * ou « Perso » : tous les N jours / semaines / mois (/ ans).
 */
export function RecurrenceField<U extends RecurrenceUnit>({ units, value, interval, onChange, hint, label = 'Répétition' }: {
  units: U[];
  value: U | 'none';
  interval: number;
  onChange: (value: U | 'none', interval: number) => void;
  /** Précision affichée sous le choix (ex. « Le même jour chaque mois »). */
  hint?: ReactNode;
  label?: string;
}) {
  const n = normalizeInterval(interval);
  const [custom, setCustom] = useState(value !== 'none' && n > 1);
  // Texte tapé dans le champ « tous les N » (peut être vide le temps de la saisie).
  const [typed, setTyped] = useState(String(n));

  const options: Option<Choice<U>>[] = [
    { value: 'none', label: 'Aucune' },
    ...units.map((u) => ({ value: u, label: PRESET_LABEL[u] })),
    { value: 'custom', label: 'Perso' },
  ];
  const selected: Choice<U> = custom && value !== 'none' ? 'custom' : value;

  function choose(c: Choice<U>) {
    if (c === 'custom') {
      const unit = value === 'none' ? units[0] : value;
      const next = Math.max(2, n);
      setCustom(true);
      setTyped(String(next));
      onChange(unit, next);
      return;
    }
    setCustom(false);
    setTyped('1');
    onChange(c, 1);
  }

  function changeCount(raw: string) {
    setTyped(raw);
    if (value !== 'none' && raw.trim()) onChange(value, normalizeInterval(raw));
  }

  const summary = value !== 'none' && custom ? recurrenceText(value, n) : null;
  return (
    <Field
      label={label}
      hint={summary || hint ? <>{summary}{summary && hint ? ' · ' : ''}{hint}</> : undefined}
    >
      <OptionGroup options={options} value={selected} onChange={choose} />
      {selected === 'custom' && value !== 'none' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          <span>{UNIT_PLURAL[value].feminine ? 'Toutes les' : 'Tous les'}</span>
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_RECURRENCE_INTERVAL}
            value={typed}
            aria-label="Intervalle de répétition"
            onChange={(e) => changeCount(e.target.value)}
            onBlur={() => setTyped(String(n))}
            style={{ width: 72, textAlign: 'center' }}
          />
          <Select
            value={value}
            aria-label="Unité de répétition"
            onChange={(e) => onChange(e.target.value as U, n)}
            style={{ flex: 1, minWidth: 0 }}
          >
            {units.map((u) => <option key={u} value={u}>{UNIT_PLURAL[u].plural}</option>)}
          </Select>
        </div>
      )}
    </Field>
  );
}
