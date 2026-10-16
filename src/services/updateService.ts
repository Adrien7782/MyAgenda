import type { AppUpdate, Notifier, Updater, UpdateProgress } from './ports';
import { SettingKeys, type SettingsService } from './settingsService';

/** Message lisible pour une erreur du module de mise à jour. */
export function describeUpdateError(e: unknown, phase: 'check' | 'install' = 'check'): string {
  const raw = e instanceof Error ? e.message : String(e);
  const msg = raw.toLowerCase();
  if (phase === 'install' && (msg.includes('404') || msg.includes('not found'))) {
    return "Le fichier d'installation de cette version est introuvable sur GitHub. Réessaie plus tard : une version corrigée va être publiée.";
  }
  if (msg.includes('404') || msg.includes('valid release json') || msg.includes('not found')) {
    return "Aucune version publiée n'a été trouvée pour l'instant.";
  }
  if (msg.includes('signature')) {
    return "La mise à jour téléchargée n'est pas signée par l'auteur de My Agenda : elle a été refusée.";
  }
  if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('dns') || msg.includes('network') || msg.includes('connect')) {
    return 'Impossible de joindre le serveur des mises à jour. Vérifie ta connexion Internet.';
  }
  return raw || 'Erreur inconnue';
}

/** Les notes de version arrivent en Markdown : on garde un texte simple et lisible. */
export function cleanReleaseNotes(notes: string | undefined): string[] {
  if (!notes) return [];
  // Le mode d'emploi d'installation (après "---") ne concerne pas l'application déjà installée.
  const lines = notes.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^\s*---\s*$/.test(l));
  return (cut === -1 ? lines : lines.slice(0, cut))
    .map((l) => l.replace(/^#+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[-*]\s+/, '• ').trimEnd())
    .filter((l, i, all) => l.trim() !== '' || (i > 0 && all[i - 1].trim() !== ''))
    .slice(0, 40);
}

/**
 * Mises à jour de l'application : recherche (avec une notification Windows
 * la première fois qu'une version est trouvée) puis installation.
 */
export function createUpdateService(updater: Updater, settings: SettingsService, notifier: Notifier) {
  return {
    supported: updater.supported,
    currentVersion: __APP_VERSION__,

    async check(opts: { notify: boolean }): Promise<AppUpdate | null> {
      const update = await updater.check();
      if (update && opts.notify) {
        const already = await settings.get(SettingKeys.updateNotifiedVersion);
        if (already !== update.version) {
          await settings.set(SettingKeys.updateNotifiedVersion, update.version);
          await notifier.notify(
            'Nouvelle version disponible',
            `My Agenda ${update.version} est prête. Ouvre Réglages → Mises à jour pour l'installer en un clic.`,
          );
        }
      }
      return update;
    },

    install(onProgress?: (p: UpdateProgress) => void): Promise<void> {
      return updater.install(onProgress);
    },
  };
}

export type UpdateService = ReturnType<typeof createUpdateService>;
