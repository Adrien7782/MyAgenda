import { useRef, useState } from 'react';

/**
 * Poignée verticale pour redimensionner un panneau en glissant.
 * `side="left"` : la poignée est sur le bord gauche d'un panneau ancré à droite
 * (glisser vers la gauche l'élargit).
 */
export function ResizeHandle({ width, onResize, onResizeEnd, side = 'left', onDoubleClick }: {
  width: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
  side?: 'left' | 'right';
  onDoubleClick?: () => void;
}) {
  const [active, setActive] = useState(false);
  const drag = useRef<{ x: number; w: number; last: number } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: width, last: width };
    setActive(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.last = side === 'left' ? d.w - dx : d.w + dx;
    onResize(d.last);
  }

  function stop() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setActive(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    onResizeEnd(d.last);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Glisser pour redimensionner · double-clic pour revenir à la taille par défaut"
      className="resize-handle"
      data-active={active}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onDoubleClick={onDoubleClick}
      style={{ [side]: 0 }}
    />
  );
}
