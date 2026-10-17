import type { LocalDatabases } from '../../services/ports';
import { countRows, currentDatabaseFile, LEGACY_DB_FILE, selectDatabase } from './database';

export class SqliteDatabases implements LocalDatabases {
  readonly legacyFile = LEGACY_DB_FILE;
  readonly persistent = true;
  select(file: string) { selectDatabase(file); }
  currentFile() { return currentDatabaseFile(); }
  countRows(file: string) { return countRows(file); }
  async pathOf(file: string): Promise<string> {
    const { appConfigDir, join } = await import('@tauri-apps/api/path');
    return join(await appConfigDir(), file);
  }
}

/** Mode navigateur : une seule base en mémoire (données de démonstration). */
export class MemoryDatabases implements LocalDatabases {
  readonly legacyFile = 'flux.db';
  readonly persistent = false;
  private file: string | null = null;
  select(file: string) { this.file = file; }
  currentFile() { return this.file; }
  async countRows(): Promise<Record<string, number>> { return {}; }
  async pathOf(file: string) { return `(mémoire du navigateur) ${file}`; }
}

/** Web app : bases enregistrées dans le stockage du navigateur. */
export class WebDatabases implements LocalDatabases {
  readonly legacyFile = LEGACY_DB_FILE;
  readonly persistent = true;
  select(file: string) { selectDatabase(file); }
  currentFile() { return currentDatabaseFile(); }
  countRows(file: string) { return countRows(file); }
  async pathOf(file: string) { return `Stockage de ce navigateur (${file})`; }
}
