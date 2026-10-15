import { useRef, useState } from 'react';
import type { SubtaskDraft } from '../../../domain/task/task';
import { PlusIcon, TrashIcon } from '../../../shared/icons/Icons';
import { IconButton, StatusCheck } from '../../../shared/ui';

export function SubtaskEditor({ value, onChange }: { value: SubtaskDraft[]; onChange: (v: SubtaskDraft[]) => void }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const update = (i: number, patch: Partial<SubtaskDraft>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function add() {
    if (!draft.trim()) return;
    onChange([...value, { title: draft.trim(), is_done: 0 }]);
    setDraft('');
    inputRef.current?.focus();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value.map((st, i) => (
        <div key={st.id ?? `new-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusCheck size={16} color={st.is_done ? 'var(--success)' : 'var(--border)'} done={!!st.is_done}
            title={st.is_done ? 'Décocher' : 'Cocher'} onClick={() => update(i, { is_done: st.is_done ? 0 : 1 })} />
          <input className="ui-input" value={st.title} onChange={(e) => update(i, { title: e.target.value })}
            style={{ padding: '6px 10px', color: st.is_done ? 'var(--text-muted)' : 'var(--text)', textDecoration: st.is_done ? 'line-through' : 'none' }} />
          <IconButton label="Supprimer la sous-tâche" variant="danger" size={24} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <TrashIcon size={11} />
          </IconButton>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <input ref={inputRef} className="ui-input" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Ajouter une sous-tâche… (Entrée)" style={{ padding: '6px 10px' }} />
        <IconButton label="Ajouter" size={30} onClick={add} disabled={!draft.trim()}><PlusIcon size={13} /></IconButton>
      </div>
    </div>
  );
}
