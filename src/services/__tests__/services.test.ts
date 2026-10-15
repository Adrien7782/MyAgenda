import { describe, expect, it } from 'vitest';
import { createCalendarImportService, normalizeCalendarUrl } from '../calendarImportService';
import { createTaskService } from '../taskService';
import { createMemoryRepositories } from '../../infrastructure/memory/memoryRepositories';
import { parseIcs } from '../../infrastructure/ical/icsParser';

const soon = new Date(Date.now() + 2 * 86_400_000);
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ICS = (title: string) => `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:cours-1\nSUMMARY:${title}\nDTSTART:${stamp(soon)}\nDURATION:PT2H\nEND:VEVENT\nEND:VCALENDAR`;

describe('import de calendrier', () => {
  it('normalise les liens webcal', () => {
    expect(normalizeCalendarUrl(' webcal://ade.univ.fr/x.ics ')).toBe('https://ade.univ.fr/x.ics');
    expect(normalizeCalendarUrl('ade.univ.fr/x')).toBe('https://ade.univ.fr/x');
  });

  it('abonne, actualise (ids stables) et supprime une source', async () => {
    const repos = createMemoryRepositories();
    let body = ICS('Maths');
    const svc = createCalendarImportService({ sources: repos.sources, events: repos.events, http: { getText: async () => body }, parse: parseIcs });

    const { source, count } = await svc.subscribe({ name: 'EDT', url: 'webcal://u/x.ics' });
    expect(count).toBe(1);
    const first = (await repos.events.listAll()).filter((e) => e.source_id === source.id);
    expect(first[0].title).toBe('Maths');

    body = ICS('Maths (salle changée)');
    await svc.refresh({ ...source, url: 'https://u/x.ics' });
    const second = (await repos.events.listAll()).filter((e) => e.source_id === source.id);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id); // même id → les liens tâche ↔ évènement survivent
    expect(second[0].title).toBe('Maths (salle changée)');

    await svc.remove(source);
    expect((await repos.events.listAll()).some((e) => e.source_id === source.id)).toBe(false);
  });

  it("n'enregistre pas la source si le lien ne renvoie pas un calendrier", async () => {
    const repos = createMemoryRepositories();
    const svc = createCalendarImportService({ sources: repos.sources, events: repos.events, http: { getText: async () => '<html/>' }, parse: parseIcs });
    await expect(svc.subscribe({ name: 'x', url: 'https://x' })).rejects.toThrow();
    expect(await repos.sources.listAll()).toHaveLength(0);
  });
});

describe('service de tâches', () => {
  const draft = { title: 'Rendre le TP', status: 'todo' as const, tags: ['cours'], recurrence: 'weekly' as const,
    deadline: '2026-10-20T10:00:00.000Z', subtasks: [{ title: 'Partie 1', is_done: 0 }, { title: 'Partie 2', is_done: 0 }],
    newAttachments: [], removedAttachmentIds: [] };

  it('crée une tâche avec ses sous-tâches (bug corrigé : elles allaient sur une autre tâche)', async () => {
    const repos = createMemoryRepositories();
    const svc = createTaskService(repos.tasks);
    const t = await svc.create(draft);
    const stored = (await repos.tasks.listAll()).find((x) => x.id === t.id)!;
    expect(stored.subtasks!.map((s) => s.title)).toEqual(['Partie 1', 'Partie 2']);
    expect(stored.subtasks!.every((s) => s.task_id === t.id)).toBe(true);
  });

  it('terminer une tâche récurrente crée la suivante', async () => {
    const repos = createMemoryRepositories();
    const svc = createTaskService(repos.tasks);
    const t = await svc.create(draft);
    const { spawned } = await svc.setStatus(t, 'done');
    // Heure murale conservée malgré le passage à l'heure d'hiver (12h → 12h).
    expect(new Date(spawned!.deadline!).getHours()).toBe(new Date(draft.deadline).getHours());
    expect(new Date(spawned!.deadline!).getDate()).toBe(27);
    expect(spawned?.tags).toBe('["cours"]');
  });

  it('corbeille : la tâche reste en base et peut être restaurée', async () => {
    const repos = createMemoryRepositories();
    const svc = createTaskService(repos.tasks);
    const t = await svc.create(draft);
    await svc.moveToTrash(t);
    expect((await repos.tasks.listAll()).find((x) => x.id === t.id)?.is_deleted).toBe(1);
    await svc.restore({ ...t, is_deleted: 1 });
    expect((await repos.tasks.listAll()).find((x) => x.id === t.id)?.is_deleted).toBe(0);
  });
});
