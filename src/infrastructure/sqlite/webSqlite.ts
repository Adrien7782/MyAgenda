import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import type { SqlDatabase } from './database';

/**
 * Web app : la même base SQLite que l'application installée, exécutée dans le navigateur
 * (sql.js, SQLite compilé en WebAssembly) et enregistrée dans le stockage du navigateur (IndexedDB).
 * Les dépôts SQLite (tâches, évènements, réglages…) fonctionnent donc sans aucune modification.
 *
 * Plusieurs onglets ouverts : chaque écriture est enregistrée puis signalée aux autres onglets,
 * qui rechargent la base avant de rafraîchir l'affichage (voir WebChangeBus).
 */

const IDB_NAME = 'my-agenda';
const IDB_STORE = 'databases';
const SAVE_DELAY_MS = 40;

let sqlPromise: Promise<SqlJsStatic> | null = null;
function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm.wasm?url')])
      .then(([mod, wasm]) => mod.default({ locateFile: () => wasm.default }));
  }
  return sqlPromise;
}

// ── IndexedDB (une entrée par fichier de base : "user-xxxx.db" → octets SQLite) ──

let idbPromise: Promise<IDBDatabase> | null = null;
function idb(): Promise<IDBDatabase> {
  if (!idbPromise) {
    idbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Stockage du navigateur indisponible.'));
    });
  }
  return idbPromise;
}

function idbRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return idb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, mode);
    const req = run(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error ?? new Error('Enregistrement interrompu.'));
  }));
}

export async function storedDatabaseExists(file: string): Promise<boolean> {
  const keys = await idbRequest('readonly', (s) => s.getAllKeys());
  return keys.includes(file);
}

/** Demande au navigateur de ne pas effacer les données (Safari les purge sinon après 7 jours sans visite). */
export async function requestPersistentStorage(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* non pris en charge */ }
}

// ── Base ouverte ─────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;
type Bind = (string | number | null | Uint8Array)[];

function toBind(params: unknown[] = []): Bind {
  return params.map((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number' || typeof v === 'string' || v instanceof Uint8Array) return v;
    return String(v);
  });
}

const pendingSaves = new Set<Promise<void>>();

export class WebSqliteDatabase implements SqlDatabase {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving: Promise<void> | null = null;
  private closed = false;

  private constructor(readonly file: string, private db: SqlJsDatabase) {}

  static async open(file: string): Promise<WebSqliteDatabase> {
    const [SQL, bytes] = await Promise.all([loadSql(), idbRequest<Uint8Array | undefined>('readonly', (s) => s.get(file))]);
    return new WebSqliteDatabase(file, bytes ? new SQL.Database(bytes) : new SQL.Database());
  }

  async select<T>(query: string, bindValues?: unknown[]): Promise<T> {
    const stmt = this.db.prepare(query);
    try {
      stmt.bind(toBind(bindValues));
      const rows: Row[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as Row);
      return rows as T;
    } finally {
      stmt.free();
    }
  }

  async execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }> {
    this.db.run(query, toBind(bindValues));
    const rowsAffected = this.db.getRowsModified();
    this.scheduleSave();
    return { rowsAffected };
  }

  private scheduleSave(): void {
    if (this.closed) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DELAY_MS);
  }

  /** Enregistre la base dans le navigateur (attendu avant de prévenir les autres onglets). */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      const bytes = this.db.export();
      const previous = this.saving ?? Promise.resolve();
      const p = previous.then(() => idbRequest('readwrite', (s) => s.put(bytes, this.file))).then(() => undefined);
      this.saving = p;
      pendingSaves.add(p);
      p.finally(() => pendingSaves.delete(p)).catch(() => undefined);
    }
    await this.saving;
  }

  /** Ferme sans enregistrer (la base va être relue depuis le stockage). */
  dispose(): void {
    this.closed = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.db.close();
  }

  hasUnsavedChanges(): boolean {
    return this.saveTimer !== null;
  }
}

/** Attend la fin de tous les enregistrements en cours. */
export async function flushAllWebDatabases(): Promise<void> {
  await Promise.allSettled([...pendingSaves]);
}
