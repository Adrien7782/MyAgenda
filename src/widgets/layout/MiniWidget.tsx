import { useEffect, useRef, useState } from 'react';
import { XIcon } from '../../shared/icons/Icons';
import { IconButton } from '../../shared/ui';
import { MiniContent } from '../mini/MiniContent';
import { closeMini } from '../mini/useMiniWindowController';
import { APP_NAME } from './TitleBar';

const W = 320;
const H = 480;

/** Mode navigateur uniquement : widget flottant (dans Tauri, le mini est une vraie fenêtre séparée). */
export function MiniWidget() {
  const [pos, setPos] = useState({ x: window.innerWidth - W - 36, y: window.innerHeight - H - 36 });
  const drag = useRef<{ mx: number; my: number; wx: number; wy: number } | null>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!drag.current) return;
      const d = drag.current;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - W, d.wx + e.clientX - d.mx)),
        y: Math.max(32, Math.min(window.innerHeight - H, d.wy + e.clientY - d.my)),
      });
    };
    const up = () => { drag.current = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  return (
    <div className="fade-in" style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 90, width: W, height: H,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,.45), 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div
        onMouseDown={(e) => { drag.current = { mx: e.clientX, my: e.clientY, wx: pos.x, wy: pos.y }; e.preventDefault(); }}
        style={{
          height: 32, flexShrink: 0, background: 'var(--chrome)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 4px 0 12px', cursor: 'grab', userSelect: 'none',
        }}
      >
        <span style={{ flex: 1, fontSize: 11, color: 'var(--text)', opacity: 0.7 }}>{APP_NAME} · mini</span>
        <IconButton label="Fermer le mode mini" variant="plain" size={24} onMouseDown={(e) => e.stopPropagation()} onClick={() => void closeMini()}>
          <XIcon size={12} />
        </IconButton>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}><MiniContent /></div>
    </div>
  );
}
