/** Logo de l'application (carré accent + initiale). */
export function AppLogo({ size = 38 }: { size?: number }) {
  return (
    <div
      data-tauri-drag-region
      style={{
        width: size, height: size, borderRadius: size * 0.29, flexShrink: 0,
        background: 'var(--accent-grad, var(--accent))',
        boxShadow: size > 20 ? 'var(--btn-shadow)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--on-accent)', fontWeight: 700, fontSize: size * 0.42, lineHeight: 1,
        pointerEvents: 'none',
      }}
    >
      M
    </div>
  );
}
