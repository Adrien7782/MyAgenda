import { describe, expect, it } from 'vitest';
import { cleanReleaseNotes, createUpdateService, describeUpdateError } from '../updateService';
import { createSettingsService } from '../settingsService';
import type { AppUpdate, Notifier, SettingsRepository, Updater } from '../ports';

function memorySettings(): SettingsRepository {
  const m = new Map<string, string>();
  return { get: async (k) => m.get(k) ?? null, set: async (k, v) => { m.set(k, v); } } as SettingsRepository;
}

function setup(update: AppUpdate | null) {
  const sent: string[] = [];
  const notifier: Notifier = { ensurePermission: async () => true, notify: async (_t, body) => { sent.push(body); } };
  const updater: Updater = { supported: true, check: async () => update, install: async () => undefined };
  const service = createUpdateService(updater, createSettingsService(memorySettings()), notifier);
  return { service, sent };
}

describe('mises à jour', () => {
  it('notifie une seule fois par nouvelle version', async () => {
    const { service, sent } = setup({ version: '0.6.1', currentVersion: '0.6.0' });
    expect((await service.check({ notify: true }))?.version).toBe('0.6.1');
    await service.check({ notify: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('0.6.1');
  });

  it('pas de notification si à jour ou notifications coupées', async () => {
    const upToDate = setup(null);
    expect(await upToDate.service.check({ notify: true })).toBeNull();
    const muted = setup({ version: '0.7.0', currentVersion: '0.6.0' });
    await muted.service.check({ notify: false });
    expect([...upToDate.sent, ...muted.sent]).toEqual([]);
  });

  it('messages d’erreur lisibles', () => {
    expect(describeUpdateError(new Error('Could not fetch a valid release JSON from the remote'))).toMatch(/Aucune version/);
    expect(describeUpdateError('error sending request: dns error')).toMatch(/connexion/);
    expect(describeUpdateError(new Error('signature verification failed'))).toMatch(/signée/);
  });

  it('notes de version en texte simple', () => {
    expect(cleanReleaseNotes('## Nouveautés\n\n- **Rappels** sur les tâches\n* Mises à jour\n\n\n')).toEqual([
      'Nouveautés', '', '• Rappels sur les tâches', '• Mises à jour', '',
    ]);
  });
});
