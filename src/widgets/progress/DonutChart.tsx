import type { TaskStatus } from '../../domain/task/task';
import { STATUS_COLOR } from '../../shared/presentation/taskPresentation';

const ORDER: TaskStatus[] = ['done', 'in_progress', 'waiting', 'todo'];

/** Camembert (anneau) de répartition des statuts, avec le % terminé au centre. */
export function DonutChart({ byStatus, total, donePercent, size }: {
  byStatus: Record<TaskStatus, number>;
  total: number;
  donePercent: number;
  size: number;
}) {
  const stroke = Math.max(8, size * 0.09);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${donePercent}% des tâches terminées`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-el)" strokeWidth={stroke} />
      {total > 0 && ORDER.map((status) => {
        const fraction = byStatus[status] / total;
        if (fraction === 0) return null;
        const len = fraction * c;
        const el = (
          <circle
            key={status}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={STATUS_COLOR[status]} strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset * c + c / 4}
            style={{ transition: 'stroke-dasharray .4s ease, stroke-dashoffset .4s ease' }}
          >
            <title>{byStatus[status]}</title>
          </circle>
        );
        offset += fraction;
        return el;
      })}
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--text)" fontSize={size * 0.2} fontWeight="700" fontFamily="var(--font)">
        {donePercent}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize={Math.max(9, size * 0.075)} fontFamily="var(--font)">
        terminé
      </text>
    </svg>
  );
}
