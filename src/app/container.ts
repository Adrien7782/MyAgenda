/**
 * Racine de composition : le SEUL endroit qui choisit les implémentations concrètes.
 * - Dans Tauri  → SQLite (une base par compte) + plugin HTTP + notifications natives
 * - Web app     → la même base SQLite, enregistrée dans le navigateur (sql.js + IndexedDB)
 * - Navigateur sans serveur de comptes configuré (développement) → dépôts en mémoire avec données de démo
 * - Comptes et synchronisation → Supabase (configuré par le fichier .env)
 */
import { isDesktopTauri, isMobileApp, isTauri } from '../infrastructure/platform';
import { SqliteTaskRepository } from '../infrastructure/sqlite/sqliteTaskRepository';
import { SqliteEventRepository } from '../infrastructure/sqlite/sqliteEventRepository';
import { SqliteCalendarSourceRepository, SqliteSettingsRepository } from '../infrastructure/sqlite/sqliteSettingsRepositories';
import { createMemoryRepositories } from '../infrastructure/memory/memoryRepositories';
import { SupabaseRemoteStore } from '../infrastructure/supabase/supabaseRemoteStore';
import { SupabaseAuthGateway } from '../infrastructure/supabase/supabaseAuthGateway';
import { LocalAccountRegistry } from '../infrastructure/session/accountRegistry';
import { MemoryDatabases, SqliteDatabases, WebDatabases } from '../infrastructure/sqlite/sqliteDatabases';
import { isSupabaseConfigured } from '../infrastructure/supabase/supabaseClient';
import { WebNotifier } from '../infrastructure/web/webNotifications';
import { WebUpdater } from '../infrastructure/web/pwa';
import { AppHttpClient } from '../infrastructure/http/httpClient';
import { TauriNotifier } from '../infrastructure/tauri/tauriNotifier';
import { parseIcs } from '../infrastructure/ical/icsParser';
import { TauriChangeBus } from '../infrastructure/tauri/tauriChangeBus';
import { createReminderScheduler } from '../infrastructure/tauri/reminderScheduler';
import { createReminderService } from '../services/reminderService';
import { createUpdater } from '../infrastructure/tauri/tauriUpdater';
import { createUpdateService } from '../services/updateService';
import type { Repositories } from '../services/ports';
import { createTaskService } from '../services/taskService';
import { createEventService } from '../services/eventService';
import { createSettingsService } from '../services/settingsService';
import { createCalendarImportService } from '../services/calendarImportService';
import { createSyncService } from '../services/syncService';
import { createEventColorService } from '../services/eventColorService';
import { createAuthService } from '../services/authService';

/** Web app : navigateur avec comptes configurés (sinon, mode démo pour travailler l'interface). */
const web = !isTauri() && isSupabaseConfigured;
const demo = !isTauri() && !isSupabaseConfigured;

const repositories: Repositories = !demo
  ? {
      tasks: new SqliteTaskRepository(),
      events: new SqliteEventRepository(),
      sources: new SqliteCalendarSourceRepository(),
      settings: new SqliteSettingsRepository(),
    }
  : createMemoryRepositories();

const databases = isTauri() ? new SqliteDatabases() : web ? new WebDatabases() : new MemoryDatabases();
const sync = createSyncService(new SupabaseRemoteStore(), repositories);
const settings = createSettingsService(repositories.settings);
const notifier = web ? new WebNotifier() : new TauriNotifier();
const http = new AppHttpClient();

export const services = {
  tasks: createTaskService(repositories.tasks),
  events: createEventService(repositories.events),
  eventColors: createEventColorService(repositories.settings),
  settings,
  calendarImport: createCalendarImportService({
    sources: repositories.sources,
    events: repositories.events,
    http,
    parse: parseIcs,
  }),
  sync,
  auth: createAuthService({ auth: new SupabaseAuthGateway(), registry: new LocalAccountRegistry(), databases, sync }),
  databases,
  notifier,
  /** Mises à jour de l'application installée (GitHub Releases). */
  updates: createUpdateService(web ? new WebUpdater() : createUpdater(http), settings, notifier),
  reminders: createReminderService(createReminderScheduler(), repositories.settings),
  /** Synchronisation instantanée entre la grande fenêtre et le mini. */
  changeBus: new TauriChangeBus(),
};

/** Application installée (vraie base SQLite), sur ordinateur ou téléphone. */
export const isInstalledApp = isTauri();
/** Web app (navigateur, ou ajoutée à l'écran d'accueil de l'iPhone). */
export const isWebApp = web;
/** Navigateur sans serveur de comptes : données de démonstration non enregistrées. */
export const isDemo = demo;
/** Application installée sur un ordinateur (mini, zone de notification, démarrage automatique…). */
export const isDesktopApp = isDesktopTauri();
/** Application installée sur un téléphone. */
export const isPhoneApp = isMobileApp();
