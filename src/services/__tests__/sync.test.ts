import type { Note } from '../../domain/note/note';
import { createNoteService } from '../noteService';
import { describe, expect, it } from 'vitest';
import { createSyncService } from '../syncService';
import { createTaskService } from '../taskService';
import { createEventService } from '../eventService';
import { createAuthService } from '../authService';
import type { AccountRegistry, AuthGateway, AuthUser, LocalDatabases, RemotePage, RemoteStore, Repositories } from '../ports';
import type { Task } from '../../domain/task/task';
import type { CalendarEvent } from '../../domain/event/event';
import { createMemoryRepositories } from '../../infrastructure/memory/memoryRepositories';

/** Faux serveur Supabase : horodatage serveur + isolation par utilisateur (comme les règles RLS). */
class FakeServer {
  clock = 0;
  /** Simule un serveur où supabase/schema.sql n'a pas encore été relancé (pas de table des notes). */
  notesTable = true;
  tasks = new Map<string, { row: Task; owner: string; synced: number }>();
  events = new Map<string, { row: CalendarEvent; owner: string; synced: number }>();
  notes = new Map<string, { row: Note; owner: string; synced: number }>();
  storeFor(user: string): RemoteStore {
    const server = this;
    const page = <T>(map: Map<string, { row: T; owner: string; synced: number }>, cursor?: string): RemotePage<T> => {
      const rows = [...map.values()].filter((r) => r.owner === user && r.synced > Number(cursor ?? -1)).sort((a, b) => a.synced - b.synced);
      return { rows: rows.map((r) => structuredClone(r.row)), cursor: rows.length ? String(rows[rows.length - 1].synced) : null };
    };
    return {
      isConnected: async () => true,
      async pushTasks(ts) {
        for (const t of ts) {
          const existing = server.tasks.get(t.id);
          if (existing && existing.owner !== user) throw new Error('RLS: interdit');
          server.tasks.set(t.id, { row: structuredClone(t), owner: user, synced: ++server.clock });
        }
      },
      async pushEvents(es) {
        for (const e of es) server.events.set(e.id, { row: structuredClone(e), owner: user, synced: ++server.clock });
      },
      pullTasks: async (c) => page(server.tasks, c),
      pullEvents: async (c) => page(server.events, c),
      async pushNotes(ns) {
        if (!server.notesTable) return false;
        for (const n of ns) server.notes.set(n.id, { row: structuredClone(n), owner: user, synced: ++server.clock });
        return true;
      },
      pullNotes: async (c) => (server.notesTable ? page(server.notes, c) : null),
    };
  }
}

function device(server: FakeServer, user: string) {
  const repos: Repositories = createMemoryRepositories({ demo: false });
  return {
    repos,
    tasks: createTaskService(repos.tasks),
    events: createEventService(repos.events),
    notes: createNoteService(repos.notes),
    sync: createSyncService(server.storeFor(user), repos),
  };
}

const draft = (title: string) => ({ title, status: 'todo' as const, tags: [], recurrence: 'none' as const, subtasks: [{ title: 'étape', is_done: 0 }], newAttachments: [], removedAttachmentIds: [] });
const titles = async (d: ReturnType<typeof device>) => (await d.repos.tasks.listAll()).map((t) => t.title).sort();
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('synchronisation multi-appareils', () => {
  it('un même compte retrouve ses données sur un 2e appareil (sous-tâches comprises)', async () => {
    const server = new FakeServer();
    const pc = device(server, 'alice');
    const laptop = device(server, 'alice');
    await pc.tasks.create(draft('Réviser réseaux'));
    await pc.events.create({ title: 'CM Algo', start_at: '2026-10-20T08:00:00.000Z', duration_min: 120, is_annual: 0 });
    await pc.sync.sync();
    await laptop.sync.sync();
    expect(await titles(laptop)).toContain('Réviser réseaux');
    const t = (await laptop.repos.tasks.listAll()).find((x) => x.title === 'Réviser réseaux')!;
    expect(t.subtasks?.[0].title).toBe('étape');
    expect((await laptop.repos.events.listAll()).map((e) => e.title)).toContain('CM Algo');
  });

  it('les données d’un autre compte ne sont jamais reçues', async () => {
    const server = new FakeServer();
    const alice = device(server, 'alice');
    const bob = device(server, 'bob');
    await alice.tasks.create(draft('Secret d’Alice'));
    await alice.sync.sync();
    await bob.sync.sync();
    expect(await titles(bob)).not.toContain('Secret d’Alice');
  });

  it('les suppressions se propagent (évènement supprimé, tâche supprimée définitivement)', async () => {
    const server = new FakeServer();
    const a = device(server, 'alice');
    const b = device(server, 'alice');
    const task = await a.tasks.create(draft('À jeter'));
    const ev = await a.events.create({ title: 'Annulé', start_at: '2026-10-20T08:00:00.000Z', duration_min: 60, is_annual: 0 });
    await a.sync.sync();
    await b.sync.sync();
    await tick();
    const bTask = (await b.repos.tasks.listAll()).find((t) => t.id === task.id)!;
    await b.tasks.purge(bTask);
    await b.events.remove((await b.repos.events.listAll()).find((e) => e.id === ev.id)!);
    await b.sync.sync();
    await a.sync.sync();
    expect((await a.repos.tasks.listAll()).some((t) => t.id === task.id)).toBe(false);
    expect((await a.repos.events.listAll()).some((e) => e.id === ev.id)).toBe(false);
  });

  it('conflit : la modification la plus récente gagne', async () => {
    const server = new FakeServer();
    const a = device(server, 'alice');
    const b = device(server, 'alice');
    const t = await a.tasks.create(draft('v1'));
    await a.sync.sync();
    await b.sync.sync();
    await tick();
    await a.tasks.update(t, { title: 'version A' });
    await tick();
    const bt = (await b.repos.tasks.listAll()).find((x) => x.id === t.id)!;
    await b.tasks.update(bt, { title: 'version B (plus récente)' });
    await a.sync.sync();
    await b.sync.sync();
    await a.sync.sync();
    expect((await a.repos.tasks.listAll()).find((x) => x.id === t.id)?.title).toBe('version B (plus récente)');
    expect((await b.repos.tasks.listAll()).find((x) => x.id === t.id)?.title).toBe('version B (plus récente)');
  });

  it('les évènements importés (.ics) ne sont pas envoyés au serveur', async () => {
    const server = new FakeServer();
    const a = device(server, 'alice');
    await a.repos.events.replaceSourceEvents('src1', [{ id: 'ics-1', title: 'TD', start_at: '2026-10-20T08:00:00.000Z', duration_min: 60, is_annual: 0, source_id: 'src1', created_at: 'x', updated_at: '2026-10-15T00:00:00.000Z' }]);
    await a.sync.sync();
    expect(server.events.size).toBe(0);
  });
});

describe('synchronisation des notes', () => {
  it('une note écrite sur le PC arrive sur le téléphone, ses modifications et sa suppression aussi', async () => {
    const server = new FakeServer();
    const pc = device(server, 'alice');
    const phone = device(server, 'alice');
    const note = await pc.notes.create({ title: 'Idées', content: '<p>Voyage</p>' });
    await pc.sync.sync();
    await phone.sync.sync();
    expect((await phone.repos.notes.listAll()).map((n) => n.title)).toEqual(['Idées']);
    await tick();
    const edited = await phone.notes.update((await phone.repos.notes.listAll())[0], { content: '<p>Voyage en Italie</p>' });
    await phone.sync.sync();
    await pc.sync.sync();
    expect((await pc.repos.notes.listAll())[0].content).toBe('<p>Voyage en Italie</p>');
    await tick();
    await pc.notes.purge(edited);
    await pc.sync.sync();
    await phone.sync.sync();
    expect(await phone.repos.notes.listAll()).toEqual([]);
    expect(note.id).toBe(edited.id);
  });

  it('serveur pas encore mis à jour : les notes restent locales puis partent dès que la table existe', async () => {
    const server = new FakeServer();
    server.notesTable = false;
    const pc = device(server, 'alice');
    const phone = device(server, 'alice');
    await pc.notes.create({ title: 'Avant la mise à jour du serveur' });
    await pc.tasks.create(draft('Tâche'));
    await pc.sync.sync(); // les tâches passent, les notes attendent
    expect(server.notes.size).toBe(0);
    expect(server.tasks.size).toBe(1);
    server.notesTable = true;
    await tick();
    await pc.sync.sync();
    await phone.sync.sync();
    expect((await phone.repos.notes.listAll()).map((n) => n.title)).toEqual(['Avant la mise à jour du serveur']);
  });
});

describe('comptes : base locale par utilisateur', () => {
  function setup(legacyRows: number) {
    const map = new Map<string, string>();
    let legacyOwner: string | null = null;
    const registry: AccountRegistry = {
      databaseFor: (id) => map.get(id) ?? null,
      assign: (id, f) => { map.set(id, f); },
      legacyOwner: () => legacyOwner,
      setLegacyOwner: (id) => { legacyOwner = id; },
    };
    let current: string | null = null;
    const databases: LocalDatabases = {
      legacyFile: 'flux.db', persistent: true,
      select: (f) => { current = f; }, currentFile: () => current,
      countRows: async () => ({ 'Tâches actives': legacyRows, 'Réglages': 3 }),
      pathOf: async (f) => f,
    };
    const users: Record<string, AuthUser> = { a: { id: 'aaaa-1111', email: 'a@x.fr' }, b: { id: 'bbbb-2222', email: 'b@x.fr' } };
    let signedIn: AuthUser | null = null;
    const auth: AuthGateway = {
      isConfigured: () => true,
      currentUser: async () => signedIn,
      signIn: async (email) => (signedIn = email.startsWith('a') ? users.a : users.b),
      signUp: async () => ({ needsVerification: true, user: null }),
      verifySignupCode: async () => users.a,
      resendSignupCode: async () => undefined,
      sendPasswordResetCode: async () => undefined,
      resetPassword: async () => users.a,
      signOut: async () => { signedIn = null; },
    };
    const repos = createMemoryRepositories();
    const svc = createAuthService({ auth, registry, databases, sync: createSyncService(new FakeServer().storeFor('x'), repos) });
    return { svc, current: () => current, users };
  }

  it('propose de rattacher les anciennes données au 1er compte, puis plus jamais', async () => {
    const { svc, current, users } = setup(12);
    const first = await svc.signIn('a@x.fr', 'pw');
    expect(first.kind).toBe('legacyChoice');
    const after = await svc.decideLegacy(users.a, true);
    expect(after.kind).toBe('signedIn');
    expect(current()).toBe('flux.db');
    await svc.signOut();
    const second = await svc.signIn('b@x.fr', 'pw');
    expect(second.kind).toBe('signedIn'); // Bob n'est pas invité à prendre les données d'Alice
    expect(current()).toMatch(/^user-bbbb2222/);
    await svc.signIn('a@x.fr', 'pw');
    expect(current()).toBe('flux.db');
  });

  it('sans anciennes données : base dédiée directement', async () => {
    const { svc, current } = setup(0);
    const s = await svc.signIn('a@x.fr', 'pw');
    expect(s.kind).toBe('signedIn');
    expect(current()).toMatch(/^user-aaaa1111/);
  });
});
