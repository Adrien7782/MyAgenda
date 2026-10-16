import { describe, expect, it } from 'vitest';
import {
  addTime, clampDuration, formatClock, formatDuration, idleSession, isActive, parseSession,
  pause, remainingFraction, remainingMs, resume, settle, start, stop,
} from '../focus/focus';

const MIN = 60_000;
const T0 = 1_000_000;

describe('mode concentration', () => {
  it('compte à rebours basé sur l’heure de fin', () => {
    const s = start(idleSession(25 * MIN), T0);
    expect(s.status).toBe('running');
    expect(remainingMs(s, T0 + 10 * MIN)).toBe(15 * MIN);
    expect(remainingFraction(s, T0 + 10 * MIN)).toBeCloseTo(0.6);
    expect(isActive(s)).toBe(true);
  });

  it('pause puis reprise conservent le temps restant', () => {
    const paused = pause(start(idleSession(10 * MIN), T0), T0 + 4 * MIN);
    expect(remainingMs(paused, T0 + 60 * MIN)).toBe(6 * MIN); // le temps ne file plus
    const resumed = resume(paused, T0 + 60 * MIN);
    expect(remainingMs(resumed, T0 + 61 * MIN)).toBe(5 * MIN);
  });

  it('se termine à l’heure de fin', () => {
    const s = start(idleSession(5 * MIN), T0);
    expect(settle(s, T0 + 4 * MIN).status).toBe('running');
    const done = settle(s, T0 + 5 * MIN);
    expect(done.status).toBe('finished');
    expect(remainingFraction(done, T0 + 6 * MIN)).toBe(0);
    expect(isActive(done)).toBe(false);
  });

  it('ajout de temps en cours de séance, en pause et au réglage', () => {
    const running = addTime(start(idleSession(10 * MIN), T0), 5 * MIN, T0 + 2 * MIN);
    expect(remainingMs(running, T0 + 2 * MIN)).toBe(13 * MIN);
    expect(running.durationMs).toBe(15 * MIN);
    const paused = addTime(pause(start(idleSession(10 * MIN), T0), T0), -20 * MIN, T0);
    expect(remainingMs(paused, T0)).toBe(1000);
    expect(addTime(idleSession(25 * MIN), 5 * MIN, T0).durationMs).toBe(30 * MIN);
  });

  it('arrêter garde la durée choisie', () => {
    expect(stop(start(idleSession(45 * MIN), T0))).toEqual(idleSession(45 * MIN));
  });

  it('bornes et affichage', () => {
    expect(clampDuration(0)).toBe(MIN);
    expect(clampDuration(20 * 60 * MIN)).toBe(12 * 60 * MIN);
    expect(formatClock(25 * MIN)).toBe('25:00');
    expect(formatClock(4 * MIN + 4_100)).toBe('04:05');
    expect(formatClock(90 * MIN)).toBe('1:30:00');
    expect(formatDuration(90 * MIN)).toBe('1 h 30');
  });

  it('lecture tolérante de la séance mémorisée', () => {
    expect(parseSession(null)).toEqual(idleSession());
    expect(parseSession('n’importe quoi')).toEqual(idleSession());
    const s = start(idleSession(30 * MIN), T0);
    expect(parseSession(JSON.stringify(s))).toEqual(s);
  });
});
