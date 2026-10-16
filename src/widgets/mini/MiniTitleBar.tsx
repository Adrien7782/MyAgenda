import { useEffect } from 'react';
import { services } from '../../app/container';
import { currentMiniWindow } from '../../infrastructure/tauri/miniWindow';
import { SettingKeys } from '../../services/settingsService';
import { useSettingsStore } from '../../store/settingsStore';
import { AppLogo } from '../layout/AppLogo';
import { hasNativeMacControls } from '../../infrastructure/platform';

function PinGlyph({ active }: { active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" /><path d="M9 10.76V6h6v4.76l2 3.24H7z" /><path d="M8 6h8" />
    </svg>
  );
}

/** Barre de titre de la fenêtre mini : déplacer, épingler au premier plan, fermer. */
export function MiniTitleBar() {
  const onTop = useSettingsStore((s) => s.miniAlwaysOnTop);
  const setOnTop = useSettingsStore((s) => s.setMiniAlwaysOnTop);
  const mac = hasNativeMacControls();

  useEffect(() => { void currentMiniWindow.setAlwaysOnTop(onTop); }, [onTop]);

  async function close() {
    await services.settings.setBool(SettingKeys.miniOpen, false);
    services.changeBus.publish('mini');
    await currentMiniWindow.close();
  }

  return (
    <div data-tauri-drag-region style={{
      height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', background: 'var(--chrome)',
      borderBottom: '1px solid var(--border)', userSelect: 'none',
    }}>
      <div data-tauri-drag-region style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: mac ? 64 : 10, height: '100%', minWidth: 0 }}>
        <AppLogo size={14} />
        <span data-tauri-drag-region style={{ fontSize: 11, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Agenda Mini</span>
      </div>
      <button type="button" className="win-btn" style={{ width: 38, color: onTop ? 'var(--accent)' : undefined, opacity: onTop ? 1 : undefined }}
        title={onTop ? 'Ne plus garder au premier plan' : 'Garder au premier plan'} aria-pressed={onTop} onClick={() => setOnTop(!onTop)}>
        <PinGlyph active={onTop} />
      </button>
      {!mac && (
        <button type="button" className="win-btn win-btn--close" style={{ width: 40 }} title="Fermer le mini" aria-label="Fermer le mini" onClick={close}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><path d="M0.5 0.5l9 9M9.5 0.5l-9 9" /></svg>
        </button>
      )}
    </div>
  );
}
