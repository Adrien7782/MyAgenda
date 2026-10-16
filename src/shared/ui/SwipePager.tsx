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
  /**
   * Un geste = au plus UNE période. Armé par le doigt (ou la molette/le pavé tactile),
   * consommé au premier changement : l'inertie du lancer ne peut pas en ajouter une seconde.
   */
  const armed = useRef(false);
  const supportsScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window;

  // Après chaque changement de période (ou de taille d'écran) : page du milieu, instantanément.
  const recenter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth, behavior: 'instant' as ScrollBehavior });
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
    const width = el?.clientWidth ?? 0;
    if (!el || touching.current || width === 0) return;
    const index = Math.round(el.scrollLeft / width);
    // Encore en train de glisser vers une page : on attend la fin de l'animation.
    if (Math.abs(el.scrollLeft - index * width) > 2) return;
    if (index === 1) return;
    if (!armed.current) {
      // Défilement résiduel après un changement : on revient simplement sur la page affichée.
      recenter();
      return;
    }
    armed.current = false;
    onMove(index < 1 ? -1 : 1);
  }, [onMove, recenter]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      if (supportsScrollEnd) return;
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(settle, 160);
    };
    const onScrollEnd = () => settle();
    el.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      clearTimeout(settleTimer.current);
    };
  }, [settle, supportsScrollEnd]);

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
      data-swipe-pager
      onTouchStart={() => { touching.current = true; armed.current = true; clearTimeout(settleTimer.current); syncVertical(); }}
      onTouchEnd={() => {
        touching.current = false;
        // Doigt relevé pile sur une page (aucun défilement ensuite) : rien d'autre ne préviendrait.
        clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(settle, 160);
      }}
      onTouchCancel={() => { touching.current = false; }}
      onWheel={(e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) armed.current = true; }}
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
