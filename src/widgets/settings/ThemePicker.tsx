import { THEMES } from '../../shared/presentation/themes';
import { useSettingsStore } from '../../store/settingsStore';

export function ThemePicker() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {THEMES.map((t) => (
        <ThemePreview key={t.key} label={t.label} accent={t.accent} bg={t.bg} active={theme === t.key} onClick={() => setTheme(t.key)} />
      ))}
    </div>
  );
}

/** Mini-maquette de l'application dans les couleurs du thème. */
function ThemePreview({ label, accent, bg, active, onClick }: { label: string; accent: string; bg: string; active: boolean; onClick: () => void }) {
  const surface = `color-mix(in srgb, ${bg} 70%, white)`;
  const sidebar = `color-mix(in srgb, ${bg} 55%, black)`;
  const border = `color-mix(in srgb, ${accent} 18%, ${bg})`;
  const muted = `color-mix(in srgb, ${bg} 40%, white)`;

  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 140, height: 100, borderRadius: 12, overflow: 'hidden', position: 'relative', background: bg,
        border: `2px solid ${active ? accent : 'var(--border)'}`,
        boxShadow: active ? `0 0 18px color-mix(in srgb, ${accent} 40%, transparent)` : '0 4px 12px rgba(0,0,0,.2)',
        transition: 'all .2s',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 11, background: `color-mix(in srgb, ${bg} 35%, black)`, borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end', paddingRight: 4, gap: 4, alignItems: 'center' }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: 5, height: i === 0 ? 1 : 4, border: i === 0 ? 'none' : `1px solid ${muted}`, background: i === 0 ? muted : 'transparent' }} />)}
        </div>
        <div style={{ position: 'absolute', left: 0, top: 11, bottom: 0, width: 16, background: sidebar, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, gap: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
        </div>
        <div style={{ position: 'absolute', left: 16, right: 0, top: 11, bottom: 0, padding: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 2, borderBottom: `1px solid ${border}` }}>
            <div style={{ height: 4, width: 28, borderRadius: 2, background: muted, opacity: 0.7 }} />
            <div style={{ marginLeft: 'auto', height: 5, width: 14, borderRadius: 3, background: accent }} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 10, borderRadius: 3, background: surface, border: `1px solid ${border}`, borderLeft: `2px solid ${i === 0 ? accent : i === 1 ? '#f43f5e' : border}`, opacity: 0.85 }} />
          ))}
        </div>
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
        {label}
      </span>
    </button>
  );
}
