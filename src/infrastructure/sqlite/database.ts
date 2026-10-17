import { isTauri } from '../platform';

/**
 * Bases SQLite locales :
 * - application installée : fichiers dans %APPDATA%\com.flux.desktop\ (plugin SQL de Tauri) ;
 * - web app : la même base, enregistrée dans le stockage du navigateur (voir webSqlite.ts).
 * Une base par compte utilisateur (`user-xxxxxxxx.db`) ; `flux.db` = base historique (avant les comptes),
 * rattachée au 1er compte qui l'accepte.
 * ⚠️ L'identifiant de l'app (tauri.conf.json) ne doit pas changer, sinon le dossier change.
 */
export const LEGACY_DB_FILE = 'flux.db';

/** Ce que les dépôts utilisent : le sous-ensemble commun au plugin Tauri et à la version web. */
export interface SqlDatabase {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>;
  /** Web app seulement. */
  flush?(): Promise<void>;
  dispose?(): void;
  hasUnsavedChanges?(): boolean;
}

let currentFile: string | null = null;
let instance: Promise<SqlDatabase> | null = null;

async function open(file: string): Promise<SqlDatabase> {
  let db: SqlDatabase;
  if (isTauri()) {
    const { default: DatabaseClass } = await import('@tauri-apps/plugin-sql');
    db = await DatabaseClass.load(`sqlite:${file}`);
  } else {
    const { WebSqliteDatabase } = await import('./webSqlite');
    db = await WebSqliteDatabase.open(file);
  }
  await migrate(db);
  return db;
}

/** Sélectionne la base du compte connecté (appelé après la connexion). */
export function selectDatabase(file: string): void {
  if (file === currentFile) return;
  currentFile = file;
  instance = null;
}

export function currentDatabaseFile(): string | null {
  return currentFile;
}

export function getDb(): Promise<SqlDatabase> {
  if (!currentFile) return Promise.reject(new Error('Aucun compte connecté : base de données non sélectionnée.'));
  if (!instance) instance = open(currentFile);
  return instance;
}

/** Web app : enregistre la base ouverte dans le navigateur (avant de prévenir les autres onglets). */
export async function flushDb(): Promise<void> {
  const db = instance ? await instance.catch(() => null) : null;
  await db?.flush?.();
}

/** Web app : un autre onglet a modifié la base → on la relit depuis le stockage du navigateur. */
export async function reloadDb(file: string): Promise<void> {
  if (file !== currentFile || !instance) return;
  const old = await instance.catch(() => null);
  if (old?.hasUnsavedChanges?.()) await old.flush?.();
  old?.dispose?.();
  instance = open(file);
  await instance;
}

/** Compte les lignes des tables principales d'une base (sans la sélectionner). */
export async function countRows(file: string): Promise<Record<string, number>> {
  if (!isTauri() && file !== currentFile) {
    // Web app : ne pas créer de base vide juste pour la compter.
    const { storedDatabaseExists } = await import('./webSqlite');
    if (!(await storedDatabaseExists(file))) return {};
  }
  const db = file === currentFile && instance ? await instance : await open(file);
  const out: Record<string, number> = {};
  const queries: Record<string, string> = {
    'Tâches actives': 'SELECT COUNT(*) AS n FROM tasks WHERE is_deleted = 0',
    'Tâches dans la corbeille': 'SELECT COUNT(*) AS n FROM tasks WHERE is_deleted = 1',
    'Sous-tâches': 'SELECT COUNT(*) AS n FROM subtasks',
    'Évènements personnels': 'SELECT COUNT(*) AS n FROM events WHERE source_id IS NULL AND COALESCE(is_deleted, 0) = 0',
    'Évènements importés (.ics)': 'SELECT COUNT(*) AS n FROM events WHERE source_id IS NOT NULL',
    'Calendriers importés': 'SELECT COUNT(*) AS n FROM calendar_sources',
    'Pièces jointes': 'SELECT COUNT(*) AS n FROM attachments',
    'Notes': 'SELECT COUNT(*) AS n FROM notes WHERE is_deleted = 0',
    'Réglages': 'SELECT COUNT(*) AS n FROM settings',
  };
  for (const [label, sql] of Object.entries(queries)) {
    const rows = await db.select<{ n: number }[]>(sql);
    out[label] = Number(rows[0]?.n ?? 0);
  }
  return out;
}

async function migrate(db: SqlDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      comment     TEXT,
      deadline    TEXT,
      status      TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','waiting','done')),
      event_id    TEXT,
      is_deleted  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    )`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      start_at      TEXT NOT NULL,
      duration_min  INTEGER NOT NULL,
      comment       TEXT,
      participants  TEXT,
      is_annual     INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    )`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL,
      title      TEXT NOT NULL,
      is_done    INTEGER DEFAULT 0,
      position   INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id         TEXT PRIMARY KEY,
      task_id    TEXT NOT NULL,
      remind_at  TEXT NOT NULL,
      type       TEXT CHECK (type IN ('snooze','custom')),
      is_sent    INTEGER DEFAULT 0
    )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

  const rows = await db.select<{ value: string }[]>("SELECT value FROM settings WHERE key = 'schema_version'");
  const version = rows[0] ? parseInt(rows[0].value, 10) : 0;
  const setVersion = (v: number) =>
    db.execute(
      "INSERT INTO settings (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(v)],
    );
  const tryExec = async (sql: string) => {
    try { await db.execute(sql); } catch { /* colonne déjà présente */ }
  };

  if (version < 1) {
    await tryExec('ALTER TABLE tasks ADD COLUMN priority TEXT');
    await tryExec('ALTER TABLE tasks ADD COLUMN tags TEXT');
    await tryExec("ALTER TABLE tasks ADD COLUMN recurrence TEXT DEFAULT 'none'");
    await setVersion(1);
  }
  if (version < 2) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id           TEXT PRIMARY KEY,
        task_id      TEXT NOT NULL REFERENCES tasks(id),
        file_name    TEXT NOT NULL,
        file_type    TEXT,
        file_size    INTEGER,
        storage_path TEXT,
        created_at   TEXT DEFAULT (datetime('now'))
      )`);
    await setVersion(2);
  }
  if (version < 3) {
    // Import d'emplois du temps (.ics)
    await tryExec('ALTER TABLE events ADD COLUMN location TEXT');
    await tryExec('ALTER TABLE events ADD COLUMN source_id TEXT');
    await tryExec('ALTER TABLE events ADD COLUMN external_uid TEXT');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS calendar_sources (
        id             TEXT PRIMARY KEY,
        name           TEXT NOT NULL,
        url            TEXT,
        color          TEXT NOT NULL,
        last_synced_at TEXT,
        last_error     TEXT,
        created_at     TEXT NOT NULL
      )`);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_events_source ON events(source_id)');
    await setVersion(3);
  }
  if (version < 4) {
    // Suppressions synchronisées entre appareils (pierres tombales)
    await tryExec('ALTER TABLE events ADD COLUMN is_deleted INTEGER DEFAULT 0');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_events_updated ON events(updated_at)');
    await setVersion(4);
  }
  if (version < 5) {
    // Rappels personnalisés (délai avant l'échéance ou date fixe)
    for (const table of ['tasks', 'events']) {
      await tryExec(`ALTER TABLE ${table} ADD COLUMN reminder_offset_min INTEGER`);
      await tryExec(`ALTER TABLE ${table} ADD COLUMN reminder_at TEXT`);
    }
    await setVersion(5);
  }
  if (version < 6) {
    // 1.1 : évènements répétés (chaque jour / semaine / mois / année) et notes
    await tryExec('ALTER TABLE events ADD COLUMN recurrence TEXT');
    await tryExec('ALTER TABLE events ADD COLUMN recurrence_until TEXT');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL DEFAULT '',
        content     TEXT NOT NULL DEFAULT '',
        color       TEXT,
        is_pinned   INTEGER NOT NULL DEFAULT 0,
        is_deleted  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      )`);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at)');
    await setVersion(6);
  }
}

/** Les colonnes SQLite NULL deviennent `undefined` côté TypeScript (champs optionnels). */
export function nullsToUndefined<T extends object>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  for (const k of Object.keys(out)) if (out[k] === null) out[k] = undefined;
  return out as T;
}
