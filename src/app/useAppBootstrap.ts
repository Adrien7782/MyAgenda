import { useEffect, useState } from 'react';
import { isDesktopApp, services } from './container';
import { SettingKeys } from '../services/settingsService';
import type { WindowRole } from '../infrastructure/tauri/windowRole';
import { miniWindow } from '../infrastructure/tauri/miniWindow';
import { useInterval } from '../shared/hooks/useInterval';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { useEventStore } from '../store/eventStore';
import { useSyncStore } from '../store/syncStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useUpdateStore } from '../store/updateStore';
import { focusEndNotification, useFocusStore } from '../store/focusStore';
import { useFocusWatcher } from '../widgets/focus/useFocusClock';
import { openMini, toggleMini } from '../widgets/mini/useMiniWindowController';
import { desktopIntegration } from '../infrastructure/tauri/desktopIntegration';

const SYNC_INTERVAL_MS = 30_000;
/** Le planning couvre 48 h : on le recalcule régulièrement pour faire entrer les rappels suivants. */
const REMINDER_REFRESH_MS = 10 * 60_000;
/** Vérifie toutes les 30 min si un calendrier importé a plus de 6 h et le ré-télécharge. */
const CALENDAR_REFRESH_CHECK_MS = 30 * 60_000;
/** Mises à jour : première vérification peu après le démarrage, puis toutes les 6 h. */
const UPDATE_FIRST_CHECK_MS = 8_000;
const UPDATE_CHECK_MS = 6 * 60 * 60_000;

/**
 * Démarrage d'une fenêtre, dans l'ordre :
 * 1. réglages (thème…) 2. données locales 3. écoute des modifications faites dans l'autre fenêtre
 * 4. (grande fenêtre uniquement) tâches de fond : calendriers importés, sync cloud, rappels, réouverture du mini.
 */
export function useAppBootstrap(role: WindowRole): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const isMain = role === 'main';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await useSettingsStore.getState().hydrate();
        await Promise.all([useTaskStore.getState().load(), useEventStore.getState().load(), useFocusStore.getState().hydrate()]);
        if (cancelled) return;
        setReady(true);
        if (!isMain) return;
        void useTaskStore.getState().alignToEvents(useEventStore.getState().events);
        void useEventStore.getState().refreshStaleSources();
        void useSyncStore.getState().syncNow();
        // Le mini était ouvert à la dernière fermeture ? On le rouvre.
        if (isDesktopApp && (await services.settings.getBool(SettingKeys.miniOpen))) void openMini();
      } catch (e) {
        console.error('[Bootstrap]', e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [isMain]);

  // Une modification dans l'autre fenêtre → on relit la donnée concernée.
  useEffect(() => {
    let off: (() => void) | undefined;
    void services.changeBus.subscribe((channel) => {
      if (channel === 'tasks') void useTaskStore.getState().load();
      if (channel === 'events') void useEventStore.getState().load();
      if (channel === 'settings') void useSettingsStore.getState().hydrate();
      if (channel === 'mini' && isMain) void miniWindow.isOpen().then((open) => useUiStore.getState().setMiniOpen(open));
      if (channel === 'auth') void useAuthStore.getState().restore();
      if (channel === 'focus') void useFocusStore.getState().hydrate();
    }).then((fn) => { off = fn; });
    return () => off?.();
  }, [isMain]);

  // Menu de l'icône (zone de notification) → afficher / masquer le mini.
  useEffect(() => {
    if (!isMain) return;
    let off: (() => void) | undefined;
    void desktopIntegration.onTrayToggleMini(() => void toggleMini()).then((fn) => { off = fn; });
    return () => off?.();
  }, [isMain]);

  useEffect(() => {
    if (isMain && ready && notificationsEnabled) void services.notifier.ensurePermission();
  }, [isMain, ready, notificationsEnabled]);

  useInterval(() => void useSyncStore.getState().syncNow(), isMain && ready ? SYNC_INTERVAL_MS : null);

  // Retour du réseau → on synchronise immédiatement.
  useEffect(() => {
    if (!isMain || !ready) return;
    const onOnline = () => void useSyncStore.getState().syncNow();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [isMain, ready]);

  useInterval(() => void useEventStore.getState().refreshStaleSources(), isMain && ready ? CALENDAR_REFRESH_CHECK_MS : null);

  // ── Rappels : le planning est recalculé à chaque modification et toutes les 10 min,
  // puis confié au planificateur natif (Rust) qui notifie même application cachée.
  const autoAlerts = useSettingsStore((s) => s.autoAlerts);
  const tasks = useTaskStore((s) => s.tasks);
  const events = useEventStore((s) => s.events);
  const focusSession = useFocusStore((s) => s.session);
  const refreshReminders = () =>
    void services.reminders
      .refresh(
        useTaskStore.getState().tasks,
        useEventStore.getState().events,
        { enabled: notificationsEnabled, autoAlerts },
        focusEndNotification(useFocusStore.getState().session),
      )
      .catch((e) => console.error('[Rappels]', e));

  useEffect(() => {
    if (isMain && ready) refreshReminders();
  }, [isMain, ready, tasks, events, focusSession, notificationsEnabled, autoAlerts]); // eslint-disable-line react-hooks/exhaustive-deps

  useInterval(refreshReminders, isMain && ready ? REMINDER_REFRESH_MS : null);

  useEffect(() => {
    if (!isMain) return;
    let off: (() => void) | undefined;
    void services.reminders.onFired((key) => void services.reminders.markFired(key)).then((fn) => { off = fn; });
    return () => off?.();
  }, [isMain]);

  // ── Mode concentration : détection de la fin de séance (carillon) dans les deux fenêtres.
  useFocusWatcher(role, ready);

  // ── Mises à jour de l'application (grande fenêtre uniquement).
  useEffect(() => {
    if (!isMain || !ready) return;
    const t = window.setTimeout(() => void useUpdateStore.getState().check({ silent: true }), UPDATE_FIRST_CHECK_MS);
    return () => window.clearTimeout(t);
  }, [isMain, ready]);

  useInterval(() => void useUpdateStore.getState().check({ silent: true }), isMain && ready ? UPDATE_CHECK_MS : null);

  return { ready, error };
}
