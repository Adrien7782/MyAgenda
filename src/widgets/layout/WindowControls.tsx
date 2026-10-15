import { useEffect, useState } from 'react';
import { windowControls } from '../../infrastructure/tauri/windowControls';
import { useSettingsStore } from '../../store/settingsStore';

/** Glyphes fins façon Windows 11 (Segoe Fluent Icons), 10×10 px. */
const glyph = { width: 10, height: 10, viewBox: '0 0 10 10', fill: 'none', stroke: 'currentColor', strokeWidth: 1 } as const;

function MinimizeGlyph() {
  return <svg {...glyph}><line x1="0" y1="5.5" x2="10" y2="5.5" /></svg>;
}
function MaximizeGlyph() {
  return <svg {...glyph}><rect x="0.5" y="0.5" width="9" height="9" rx="1" /></svg>;
}
function RestoreGlyph() {
  return (
    <svg {...glyph}>
      <rect x="0.5" y="2.5" width="7" height="7" rx="1" />
      <path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" />
    </svg>
  );
}
function CloseGlyph() {
  return <svg {...glyph}><path d="M0.5 0.5l9 9M9.5 0.5l-9 9" /></svg>;
}

/** Boutons Réduire / Agrandir-Restaurer / Fermer, à droite comme sous Windows. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const closeToTray = useSettingsStore((s) => s.closeToTray);
  const closeLabel = closeToTray ? 'Fermer (My Agenda reste dans la zone de notification)' : 'Quitter My Agenda';

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const refresh = () => windowControls.isMaximized().then(setMaximized).catch(() => undefined);
    refresh();
    windowControls.onResized(refresh).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      <button type="button" className="win-btn" title="Réduire" aria-label="Réduire" onClick={() => windowControls.minimize()}>
        <MinimizeGlyph />
      </button>
      <button
        type="button"
        className="win-btn"
        title={maximized ? 'Niveau inférieur' : 'Agrandir'}
        aria-label={maximized ? 'Niveau inférieur' : 'Agrandir'}
        onClick={() => windowControls.toggleMaximize()}
      >
        {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
      </button>
      <button type="button" className="win-btn win-btn--close" title={closeLabel} aria-label={closeLabel} onClick={() => windowControls.close()}>
        <CloseGlyph />
      </button>
    </div>
  );
}
