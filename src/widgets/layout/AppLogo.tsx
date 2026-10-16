import { useId } from 'react';

/**
 * Logo de l'application — même dessin que l'icône (src-tauri/icons/app-icon.svg).
 * Si tu modifies l'icône, régénère les fichiers avec : npx tauri icon src-tauri/icons/app-icon.svg
 */
export function AppLogo({ size = 38 }: { size?: number }) {
  const gradient = `app-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg
      data-tauri-drag-region
      width={size}
      height={size}
      viewBox="4 4 92 92"
      role="img"
      aria-label="My Agenda"
      style={{
        flexShrink: 0, display: 'block', pointerEvents: 'none',
        filter: size > 20 ? 'drop-shadow(0 4px 12px rgba(45, 92, 240, 0.45))' : undefined,
      }}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f7dff" />
          <stop offset="1" stopColor="#2d5cf0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="22" fill={`url(#${gradient})`} />
      <rect x="5" y="5" width="90" height="90" rx="21" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="1.5" />
      <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 31C45 25 35 27 35 35C28 36 26 44 30 48C25 53 28 62 35 62C36 70 45 72 50 67" strokeWidth="5" />
        <path d="M50 31h13a9 9 0 0 1 9 9v19a9 9 0 0 1-9 9H50V31" strokeWidth="5" />
        <path d="M58 61h7" strokeWidth="4" />
      </g>
      <circle cx="58" cy="44" r="2.8" fill="#ffffff" />
      <circle cx="65" cy="44" r="2.8" fill="#ffffff" />
      <circle cx="58" cy="53" r="2.8" fill="#ffffff" />
      <circle cx="65" cy="53" r="4.2" fill="#9fe8ff" />
    </svg>
  );
}
