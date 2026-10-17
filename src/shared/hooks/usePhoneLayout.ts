import { useEffect, useState } from 'react';
import { IS_MOBILE_OS } from '../device';

/** En dessous de cette largeur, l'interface passe en mise en page « téléphone ». */
export const PHONE_MAX_WIDTH = 640;
/** Plus petit côté de l'écran d'un téléphone (une tablette, iPad compris, dépasse largement). */
const PHONE_SHORT_SIDE = 600;

function isPhoneScreen(): boolean {
  if (typeof screen === 'undefined') return false;
  return Math.min(screen.width, screen.height) < PHONE_SHORT_SIDE;
}

function compute(): boolean {
  // Téléphone : toujours la mise en page téléphone, même tourné à l'horizontale.
  // Tablette (iPad…) : mise en page ordinateur, sauf fenêtre étroite (écran partagé).
  return (IS_MOBILE_OS && isPhoneScreen()) || (typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH);
}

/** Mise en page téléphone : barre d'onglets en bas, une colonne, fenêtres plein écran. */
export function usePhoneLayout(): boolean {
  const [phone, setPhone] = useState(compute);
  useEffect(() => {
    const onResize = () => setPhone(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return phone;
}
