import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Navigation par glissement horizontal (téléphone) : la période précédente, l'actuelle et la
 * suivante sont posées côte à côte ; le contenu suit le doigt, et quand le défilement s'arrête
 * sur une voisine, `onMove(-1 | 1)` est appelé puis la vue est recentrée sans saut visible.
 *
 * `pageKey` identifie la période affichée (ex. « 2026-10-12 ») : chaque page porte la clé de
 * SA période, React réutilise donc les pages déjà rendues (pas de rechargement ni de clignotement).
 */
export function SwipePager({ pageKey, pageKeys, renderPage, onMove }: {
  pageKey: string;
  /** Clés des périodes précédente, actuelle et suivante. */
  pageKeys: [string, string, string];
  renderPage: (offset: -1 | 0 | 1) => ReactNode;
  onMove: (direction: -1 | 1) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const touching = useRef(false);
  const moving = useRef(false);

  // Après chaque changement de période (ou de taille d'écran) : page du milieu, instantanément.
  const recenter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth, behavior: 'instant' as ScrollBehavior });
    moving.current = false;
  }, []);
  useLayoutEffect(recenter, [pageKey, recenter]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(recenter);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recenter]);

  const settle = useCallback(() => {
    const el = ref.current;
    if (!el || touching.current || moving.current || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index === 1) return;
    moving.current = true;
    onMove(index < 1 ? -1 : 1);
  }, [onMove]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const supportsScrollEnd = 'onscrollend' in window;
    const onScroll = () => {
      if (supportsScrollEnd) return;
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 140);
    };
    const onScrollEnd = () => settle();
    el.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      clearTimeout(settleTimer.current);
    };
  }, [settle]);

  // Les grilles horaires voisines prennent la même position verticale que la page affichée,
  // pour que la journée « continue » pendant le glissement.
  function syncVertical() {
    const el = ref.current;
    if (!el) return;
    const pages = Array.from(el.children) as HTMLElement[];
    const current = pages[1]?.querySelector<HTMLElement>('[data-timegrid-scroll]');
    if (!current) return;
    for (const p of [pages[0], pages[2]]) {
      const grid = p?.querySelector<HTMLElement>('[data-timegrid-scroll]');
      if (grid) grid.scrollTop = current.scrollTop;
    }
  }

  const offsets = [-1, 0, 1] as const;
  return (
    <div
      ref={ref}
      className="h-scroll"
      onTouchStart={() => { touching.current = true; syncVertical(); }}
      onTouchEnd={() => { touching.current = false; clearTimeout(settleTimer.current); settleTimer.current = setTimeout(settle, 140); }}
      onTouchCancel={() => { touching.current = false; }}
      style={{
        flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', scrollBehavior: 'auto',
      }}
    >
      {offsets.map((offset, i) => (
        <div key={pageKeys[i]} style={{
          flex: '0 0 100%', width: '100%', minWidth: 0, height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {renderPage(offset)}
        </div>
      ))}
    </div>
  );
}
