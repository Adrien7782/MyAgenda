import type { AccountRegistry } from '../../services/ports';

const MAP_KEY = 'my-agenda:account-databases';
const LEGACY_KEY = 'my-agenda:legacy-db-owner';

/**
 * Registre stocké dans le localStorage de l'application (partagé par la grande fenêtre et le mini,
 * indépendant des bases de chaque compte). Ne contient aucune donnée personnelle : seulement
 * "identifiant de compte → nom du fichier de base".
 */
export class LocalAccountRegistry implements AccountRegistry {
  private read(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(MAP_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  databaseFor(userId: string): string | null {
    return this.read()[userId] ?? null;
  }

  assign(userId: string, file: string): void {
    const map = this.read();
    map[userId] = file;
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
  }

  legacyOwner(): string | null {
    return localStorage.getItem(LEGACY_KEY);
  }

  setLegacyOwner(userId: string): void {
    localStorage.setItem(LEGACY_KEY, userId);
  }
}
