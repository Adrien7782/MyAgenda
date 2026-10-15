import { Dot } from '../../shared/ui';

export function StatRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Dot color={color} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>{count}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-el)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}

export function SummaryTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-el)', border: '1px solid var(--border)', minWidth: 0 }}>
      <div style={{ fontSize: 'clamp(18px, 2vw, var(--text-2xl))', fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
    </div>
  );
}
