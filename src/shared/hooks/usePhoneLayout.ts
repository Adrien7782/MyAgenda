import { useEffect, useState } from 'react';
import { IS_MOBILE_OS } from '../device';

/** En dessous de cette largeur, l'interface passe en mise en page « téléphone ». */
export const PHONE_MAX_WIDTH = 640;

function compute(): boolean {
  return IS_MOBILE_OS || (typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH);
}

/** Mise en page téléphone : barre d'onglets en bas, une colonne, fenêtres plein écran. */
export function usePhoneLayout(): boolean {
  const [phone, setPhone] = useState(compute);
  useEffect(() => {
    if (IS_MOBILE_OS) return;
    const onResize = () => setPhone(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return phone;
}
