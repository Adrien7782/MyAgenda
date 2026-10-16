import { WindowControls } from './WindowControls';
import { AppLogo } from './AppLogo';
import { hasNativeMacControls } from '../../infrastructure/platform';

/** Place réservée aux pastilles natives de macOS, à gauche. */
export const MAC_TRAFFIC_LIGHTS_WIDTH = 78;

export const APP_NAME = 'My Agenda';

/**
 * Barre de titre personnalisée (la fenêtre native est sans décorations).
 * `data-tauri-drag-region` : glisser déplace la fenêtre, double-clic agrandit/restaure.
 * Sur macOS, les boutons natifs (pastilles) sont affichés à gauche par le système.
 */
export function TitleBar() {
  const mac = hasNativeMacControls();
  return (
    <div
      data-tauri-drag-region
      style={{
        height: 32, minHeight: 32, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        background: 'var(--chrome)', borderBottom: '1px solid var(--border)',
        userSelect: 'none',
      }}
    >
      <div data-tauri-drag-region style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: mac ? MAC_TRAFFIC_LIGHTS_WIDTH : 12, flex: 1, height: '100%', minWidth: 0 }}>
        <AppLogo size={16} />
        <span data-tauri-drag-region style={{ fontSize: 12, color: 'var(--text)', opacity: 0.75, whiteSpace: 'nowrap' }}>
          {APP_NAME}
        </span>
      </div>
      {!mac && <WindowControls />}
    </div>
  );
}
