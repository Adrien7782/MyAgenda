import { describe, expect, it } from 'vitest';
import { notificationId } from '../reminderScheduler';

describe('identifiants des notifications programmées (téléphone)', () => {
  it('stables, positifs, sur 31 bits et distincts', () => {
    const keys = Array.from({ length: 2000 }, (_, i) => `task:${i}:2026-10-${(i % 28) + 1}T08:00:00.000Z`);
    const ids = keys.map(notificationId);
    expect(notificationId(keys[0])).toBe(ids[0]);
    expect(ids.every((id) => Number.isInteger(id) && id > 0 && id <= 0x7fffffff)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
