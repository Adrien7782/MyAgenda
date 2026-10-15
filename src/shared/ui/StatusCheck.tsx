import { useEffect, useRef, useState } from 'react';

/** Pastille ronde cliquable représentant le statut d'une tâche (cochée = terminée). */
export function StatusCheck({ color, done, size = 18, title, onClick }: {
  color: string;
  done: boolean;
  size?: number;
  title?: string;
  onClick: () => void;
}) {
  const [pop, setPop] = useState(false);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) setPop(true);
    wasDone.current = done;
  }, [done]);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={done}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onAnimationEnd={() => setPop(false)}
      className={pop ? 'task-done-pop' : undefined}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${color}`, background: done ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s, border-color .2s',
      }}
    >
      {done && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 10 10" fill="none">
          <polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
