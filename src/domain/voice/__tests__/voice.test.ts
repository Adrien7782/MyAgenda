import { describe, expect, it } from 'vitest';
import { GuidedParser, type VoiceDraft } from '../guidedParser';
import { parseDuration, parseFrenchWhen } from '../frenchDates';
import { splitWords, trimField } from '../normalize';
import { applyDictation, draftToIntent, textToNoteHtml } from '../intent';
import type { Utterance } from '../types';

// Samedi 17 octobre 2026, 10 h.
const NOW = new Date(2026, 9, 17, 10, 0);
let nextId = 1;
/** Phrase transcrite avec des horodatages réguliers (0,4 s par mot). */
function utt(text: string): Utterance {
  const words = text.split(/\s+/).filter(Boolean).map((w, i) => ({ text: w, start: i * 0.4, end: i * 0.4 + 0.35 }));
  return { id: nextId++, text, words, duration: words.length * 0.4 };
}
const when = (s: string) => parseFrenchWhen(splitWords(s), 0, NOW);
const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const text = (d: VoiceDraft, f: 'title' | 'content' | 'location') => trimField((d.pieces[f] ?? []).map((p) => p.text).join(' '));

function run(...phrases: string[]) {
  const p = new GuidedParser(() => NOW);
  const events = phrases.flatMap((ph) => (ph === '<silence>' ? p.pause() : p.feed(utt(ph))));
  const done = events.filter((e) => e.type === 'complete').map((e) => (e as { draft: VoiceDraft }).draft);
  return { p, events, done };
}

describe('dates dites en français', () => {
  it.each([
    ['demain à 14 h', '18/10 14:00'],
    ['demain 14h30', '18/10 14:30'],
    ['après-demain matin', '19/10 09:00'],
    ['ce soir', '17/10 20:00'],
    ["aujourd'hui à midi", '17/10 12:00'],
    ['vendredi', '23/10 00:00'],
    ['lundi prochain à 9 heures et demie', '19/10 09:30'],
    ['le 25 octobre à 14 h', '25/10 14:00'],
    ['le 3', '3/11 00:00'],
    ['le 1er mars 2027', '1/3 00:00'],
    ['à 15 h', '17/10 15:00'],
    ['à 8 h', '18/10 08:00'],
    ['à 3 heures de l\'après-midi', '17/10 15:00'],
    ['à quatorze heures trente', '17/10 14:30'],
    ['dans 3 jours', '20/10 00:00'],
    ['dans 2 heures', '17/10 12:00'],
    ['pour samedi prochain', '24/10 00:00'],
    ['à 10 h moins le quart', '18/10 09:45'],
  ])('« %s » → %s', (input, expected) => {
    expect(fmt(when(input)!.date)).toBe(expected);
  });

  it("un simple nombre n'est pas une date", () => {
    expect(when('3 pommes')).toBeNull();
    expect(when('le rapport')).toBeNull();
  });

  it('durées', () => {
    expect(parseDuration(splitWords('1 heure 30'), 0)?.minutes).toBe(90);
    expect(parseDuration(splitWords('une heure et demie'), 0)?.minutes).toBe(90);
    expect(parseDuration(splitWords('45 minutes'), 0)?.minutes).toBe(45);
    expect(parseDuration(splitWords('2h'), 0)?.minutes).toBe(120);
  });
});

describe('phrases guidées', () => {
  it('note complète en une phrase', () => {
    const { done } = run('My Agenda, crée-moi une note. Titre : courses du week-end. Contenu : acheter du pain, du lait et des œufs. Stop.');
    expect(done).toHaveLength(1);
    expect(done[0].kind).toBe('note');
    expect(text(done[0], 'title')).toBe('courses du week-end');
    expect(text(done[0], 'content')).toBe('acheter du pain, du lait et des œufs');
  });

  it('« mon agenda » mal transcrit et note dite en plusieurs fois', () => {
    const { done, events } = run('Mon agenda, crée une note.', 'Titre, idées cadeaux.', 'Contenu, un livre pour Léa.', 'Et une plante.', 'Stop.');
    expect(events[0]).toEqual({ type: 'started', kind: 'note' });
    expect(text(done[0], 'title')).toBe('idées cadeaux');
    expect(text(done[0], 'content')).toBe('un livre pour Léa. Et une plante');
  });

  it('tâche : titre, échéance et priorité dites sans mot-clé', () => {
    const { done } = run('Nouvelle tâche, titre appeler le garage, pour demain 10 h, priorité haute, stop');
    const d = done[0];
    expect(d.kind).toBe('task');
    expect(text(d, 'title')).toBe('appeler le garage');
    expect(fmt(d.when!.date)).toBe('18/10 10:00');
    expect(d.priority).toBe('high');
  });

  it('tâche : date à la fin du titre, sans « titre »', () => {
    const { done } = run('Crée une tâche rendre le rapport pour vendredi à 14 h. Stop.');
    expect(text(done[0], 'title')).toBe('rendre le rapport');
    expect(fmt(done[0].when!.date)).toBe('23/10 14:00');
  });

  it("une date n'est pas coupée au milieu d'un titre", () => {
    const { done } = run('Ajoute une tâche préparer le lundi de Pâques, stop');
    expect(text(done[0], 'title')).toBe('préparer le lundi de Pâques');
    expect(done[0].when).toBeUndefined();
  });

  it('long silence : la commande commencée est terminée', () => {
    const { done } = run('Ajoute une tâche appeler maman ce soir', '<silence>');
    expect(text(done[0], 'title')).toBe('appeler maman');
    expect(fmt(done[0].when!.date)).toBe('17/10 20:00');
  });

  it('évènement : date, durée, lieu, répétition', () => {
    const { done } = run("Nouvel évènement, titre réunion d'équipe, le 25 octobre à 14 h, durée 1 heure 30, lieu salle B, stop");
    const d = done[0];
    expect(d.kind).toBe('event');
    expect(text(d, 'title')).toBe("réunion d'équipe");
    expect(fmt(d.when!.date)).toBe('25/10 14:00');
    expect(d.durationMin).toBe(90);
    expect(text(d, 'location')).toBe('salle B');
    const r = run('Crée un rendez-vous cours de piano mercredi à 17 h 30, toutes les semaines, stop').done[0];
    expect(text(r, 'title')).toBe('cours de piano');
    expect(r.repeat).toBe('weekly');
    expect(fmt(r.when!.date)).toBe('21/10 17:30');
  });

  it('ordres : éteins-toi, annule, aide', () => {
    expect(run('Éteins-toi.').events).toEqual([{ type: 'intent', intent: { kind: 'turn_off' } }]);
    expect(run("My Agenda, arrête l'écoute").events[0]).toEqual({ type: 'intent', intent: { kind: 'turn_off' } });
    const cancelled = run('Crée une note titre test', 'Annule.');
    expect(cancelled.events.at(-1)).toEqual({ type: 'intent', intent: { kind: 'cancel' } });
    expect(cancelled.p.current()).toBeNull();
    expect(run('Aide').events[0]).toEqual({ type: 'intent', intent: { kind: 'help' } });
  });

  it('phrase sans commande : non reconnue', () => {
    expect(run('Bonjour, comment ça va ?').events).toEqual([{ type: 'unrecognized', text: 'Bonjour, comment ça va ?' }]);
  });

  it('les champs gardent la position de leur son (pour la 2e passe)', () => {
    const u = utt('Crée une note titre shopping list contenu eggs and milk stop');
    const p = new GuidedParser(() => NOW);
    const d = (p.feed(u).find((e) => e.type === 'complete') as { draft: VoiceDraft }).draft;
    const content = d.pieces.content![0];
    expect(content.utteranceId).toBe(u.id);
    expect([content.start, content.end]).toEqual([u.words[7].start, u.words[9].end]);
  });
});

describe('fiche finale', () => {
  it('tâche sans heure : échéance en fin de journée ; note en HTML', () => {
    const d = run('Nouvelle tâche titre payer le loyer pour vendredi stop').done[0];
    const r = draftToIntent(d, { title: text(d, 'title') });
    expect('intent' in r && r.intent.kind === 'create_task' && fmt(new Date(r.intent.deadline!))).toBe('23/10 18:00');
    expect(textToNoteHtml('acheter du pain\nappeler Paul')).toBe('<p>Acheter du pain</p><p>Appeler Paul</p>');
  });

  it('erreurs lisibles quand il manque l’essentiel', () => {
    const d = run('Nouvel évènement titre dîner stop').done[0];
    expect(draftToIntent(d, { title: 'dîner' })).toEqual({ error: expect.stringMatching(/Il manque la date/) });
  });

  it('ponctuation dictée en français, anglais, espagnol', () => {
    expect(applyDictation('acheter du pain virgule du lait à la ligne appeler Paul point final')).toBe('acheter du pain, du lait\nappeler Paul.');
    expect(applyDictation('eggs comma milk new line bread', 'en')).toBe('eggs, milk\nbread');
    expect(applyDictation('pan coma leche', 'es')).toBe('pan, leche');
  });
});
