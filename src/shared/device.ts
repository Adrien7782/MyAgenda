import type { MouseEvent } from 'react';

/**
 * Appareil tactile / téléphone (détection côté interface, sans dépendre de Tauri).
 * Sert à adapter les gestes (un appui au lieu d'un double-clic) et la mise en page.
 */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

export const IS_ANDROID = /android/i.test(ua);
export const IS_IOS = /iPhone|iPad|iPod/i.test(ua)
  || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Téléphone ou tablette. */
export const IS_MOBILE_OS = IS_ANDROID || IS_IOS;
/** Écran tactile sans souris (téléphone, tablette). */
export const IS_TOUCH = IS_MOBILE_OS
  || (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);

/**
 * Geste pour ouvrir un élément en modification : double-clic à la souris, simple appui au doigt.
 * Usage : <div {...openGesture(() => edit(item))} />
 */
export function openGesture(open: () => void, stop = false): { onClick?: (e: MouseEvent) => void; onDoubleClick?: (e: MouseEvent) => void } {
  const handler = (e: MouseEvent) => { if (stop) e.stopPropagation(); open(); };
  return IS_TOUCH ? { onClick: handler } : { onDoubleClick: handler };
}

/** Texte d'aide qui suit le geste. */
export const OPEN_HINT = IS_TOUCH ? 'Touche pour modifier' : 'Double-clic pour modifier';
