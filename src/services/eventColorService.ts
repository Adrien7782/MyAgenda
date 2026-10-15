import { withTitleColor, type EventColorRules } from '../domain/event/eventColors';
import type { SettingsRepository } from './ports';
import { SettingKeys } from './settingsService';

/** Persistance des couleurs par titre (stockées en JSON dans la table des réglages). */
export function createEventColorService(settings: SettingsRepository) {
  async function load(): Promise<EventColorRules> {
    const raw = await settings.get(SettingKeys.eventTitleColors);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  async function setForTitle(title: string, color: string | null): Promise<EventColorRules> {
    const next = withTitleColor(await load(), title, color);
    await settings.set(SettingKeys.eventTitleColors, JSON.stringify(next));
    return next;
  }

  return { load, setForTitle };
}

export type EventColorService = ReturnType<typeof createEventColorService>;
