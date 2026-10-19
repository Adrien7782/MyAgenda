import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Les fenêtres n'ont accès qu'aux commandes listées dans src-tauri/capabilities : une permission oubliée
 * échoue en silence (ex. 1.1.0 : sans `allow-destroy`, le mini ne se fermait plus sur macOS, car la
 * fermeture par la pastille rouge passe par `onCloseRequested`, qui détruit la fenêtre lui-même).
 */
const desktop = JSON.parse(readFileSync(new URL('../../../../src-tauri/capabilities/desktop.json', import.meta.url), 'utf8')) as {
  windows: string[];
  permissions: (string | { identifier: string })[];
};
const granted = new Set(desktop.permissions.map((p) => (typeof p === 'string' ? p : p.identifier)));

describe('permissions des fenêtres (ordinateur)', () => {
  it('concernent la grande fenêtre et le mini', () => {
    expect(desktop.windows).toEqual(expect.arrayContaining(['main', 'mini']));
  });

  it.each([
    ['core:window:allow-close', 'bouton fermer, fermeture du mini depuis la grande fenêtre'],
    ['core:window:allow-destroy', 'onCloseRequested (pastille rouge du mini sur macOS)'],
    ['core:window:allow-show', 'ré-afficher le mini'],
    ['core:window:allow-hide', 'cacher les fenêtres'],
    ['core:window:allow-set-focus', 'mettre le mini au premier plan'],
    ['core:window:allow-set-always-on-top', 'épingler le mini'],
    ['core:webview:allow-create-webview-window', 'ouvrir le mini'],
  ])('%s (%s)', (permission) => {
    expect(granted.has(permission)).toBe(true);
  });
});
