import { useState } from 'react';
import { REMINDER_PRESETS, reminderTime, type ReminderSetting } from '../../domain/reminder/reminder';
import { fromLocalInputValue, toLocalInputValue } from '../../domain/shared/date';
import { BellIcon } from '../../shared/icons/Icons';
import { SegmentedControl, Select, TextInput, Toggle } from '../../shared/ui';

type Unit = 'min' | 'h' | 'j';
const UNIT_MIN: Record<Unit, number> = { min: 1, h: 60, j: 1440 };

function splitMinutes(m: number): { amount: number; unit: Unit } {
  if (m > 0 && m % 1440 === 0) return { amount: m / 1440, unit: 'j' };
  if (m > 0 && m % 60 === 0) return { amount: m / 60, unit: 'h' };
  return { amount: m, unit: 'min' };
}

function defaultFixedDate(due: Date | null): string {
  const base = due ? new Date(due.getTime() - 60 * 60_000) : new Date(Date.now() + 60 * 60_000);
  base.setSeconds(0, 0);
  return base.toISOString();
}

/**
 * Choix du rappel d'une tâche ou d'un évènement :
 * aucun · X minutes/heures/jours avant l'échéance · à une date précise.
 */
export function ReminderField({ value, onChange, due, dueLabel }: {
  value: ReminderSetting;
  onChange: (r: ReminderSetting) => void;
  /** Échéance (tâche) ou début (évènement) — null si non renseigné. */
  due: Date | null;
  /** "l'échéance" ou "le début" */
  dueLabel: string;
}) {
  const enabled = value.kind !== 'none';
  const [custom, setCustom] = useState(() => (value.kind === 'before' && !REMINDER_PRESETS.some((p) => p.minutes === value.minutes)));
  const at = reminderTime(value, due);
  const split = value.kind === 'before' ? splitMinutes(value.minutes) : { amount: 30, unit: 'min' as Unit };

  function toggle(on: boolean) {
    onChange(on ? (due ? { kind: 'before', minutes: 30 } : { kind: 'at', at: defaultFixedDate(due) }) : { kind: 'none' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: enabled ? '12px 14px' : '10px 14px', borderRadius: 10, background: 'var(--surface-el)', border: `1px solid ${enabled ? 'color-mix(in srgb, var(--accent) 35%, var(--border))' : 'var(--border)'}` }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <BellIcon size={15} color={enabled ? 'var(--accent)' : 'var(--text-muted)'} />
        <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>Rappel</span>
        <Toggle checked={enabled} onChange={toggle} label="Activer un rappel" />
      </label>

      {enabled && (
        <>
          <SegmentedControl
            size="sm"
            value={value.kind === 'at' ? 'at' : 'before'}
            onChange={(k) => onChange(k === 'at' ? { kind: 'at', at: defaultFixedDate(due) } : { kind: 'before', minutes: 30 })}
            options={[{ value: 'before', label: `Avant ${dueLabel}` }, { value: 'at', label: 'Date et heure précises' }]}
          />

          {value.kind === 'before' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {REMINDER_PRESETS.map((p) => {
                const active = !custom && value.minutes === p.minutes;
                return (
                  <button key={p.minutes} type="button" onClick={() => { setCustom(false); onChange({ kind: 'before', minutes: p.minutes }); }}
                    style={{
                      padding: '5px 10px', borderRadius: 7, fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 400,
                      border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-bg)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-muted)',
                    }}>{p.label}</button>
                );
              })}
              <button type="button" onClick={() => setCustom(true)}
                style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 'var(--text-xs)', fontWeight: custom ? 600 : 400,
                  border: `1px solid ${custom ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--border)'}`,
                  background: custom ? 'var(--accent-bg)' : 'var(--surface)', color: custom ? 'var(--accent)' : 'var(--text-muted)',
                }}>Autre…</button>
              {custom && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                  <TextInput type="number" min={0} max={999} value={split.amount} style={{ width: 80, textAlign: 'center' }}
                    onChange={(e) => onChange({ kind: 'before', minutes: Math.max(0, parseInt(e.target.value) || 0) * UNIT_MIN[split.unit] })} />
                  <Select value={split.unit} style={{ width: 120 }}
                    onChange={(e) => onChange({ kind: 'before', minutes: split.amount * UNIT_MIN[e.target.value as Unit] })}>
                    <option value="min">minutes</option>
                    <option value="h">heures</option>
                    <option value="j">jours</option>
                  </Select>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>avant {dueLabel}</span>
                </div>
              )}
            </div>
          )}

          {value.kind === 'at' && (
            <TextInput type="datetime-local" value={toLocalInputValue(value.at)}
              onChange={(e) => { const iso = fromLocalInputValue(e.target.value); if (iso) onChange({ kind: 'at', at: iso }); }} />
          )}

          <ReminderPreview at={at} needsDue={value.kind === 'before' && !due} dueLabel={dueLabel} />
        </>
      )}
    </div>
  );
}

function ReminderPreview({ at, needsDue, dueLabel }: { at: Date | null; needsDue: boolean; dueLabel: string }) {
  if (needsDue) {
    return <span style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)' }}>Renseigne {dueLabel} pour que ce rappel puisse sonner.</span>;
  }
  if (!at) return null;
  const past = at.getTime() < Date.now();
  const label = at.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <span style={{ fontSize: 'var(--text-xs)', color: past ? 'var(--warn)' : 'var(--text-muted)' }}>
      {past ? `⚠️ Cette heure est déjà passée (${label}) : le rappel ne sonnera pas.` : `🔔 Notification ${label}.`}
    </span>
  );
}
