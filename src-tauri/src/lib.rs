use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
#[cfg(desktop)]
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
#[cfg(desktop)]
use tauri_plugin_notification::NotificationExt;

// ── Rappels ──────────────────────────────────────────────────────────────────
// Ordinateur : l'interface calcule les prochains rappels et les confie au Rust ; un fil
// d'exécution natif les déclenche à l'heure, même si la fenêtre est cachée.
// Téléphone : les rappels sont confiés directement au système (Android / iOS) par l'interface,
// car l'application peut être arrêtée à tout moment en arrière-plan.

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct ScheduledReminder {
    key: String,
    at_ms: i64,
    title: String,
    body: String,
}

#[derive(Default)]
struct ReminderState {
    queue: Vec<ScheduledReminder>,
    /// Clés déjà notifiées pendant cette session (évite les doublons si le plan est renvoyé).
    fired: HashSet<String>,
}

struct Reminders(Mutex<ReminderState>);

/// Rappels manqués de plus de 15 min (PC en veille, appli fermée…) : on ne les envoie plus.
#[cfg(desktop)]
const REMINDER_GRACE_MS: i64 = 15 * 60 * 1000;

#[tauri::command]
fn schedule_reminders(state: tauri::State<Reminders>, reminders: Vec<ScheduledReminder>) {
    let mut guard = state.0.lock().unwrap_or_else(|e| e.into_inner());
    let st = &mut *guard;
    st.queue = reminders.into_iter().filter(|r| !st.fired.contains(&r.key)).collect();
}

#[cfg(desktop)]
fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

#[cfg(desktop)]
fn start_reminder_loop(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(5));
        let now = now_ms();
        let due: Vec<ScheduledReminder> = {
            let state = app.state::<Reminders>();
            let mut st = state.0.lock().unwrap_or_else(|e| e.into_inner());
            let (due, rest): (Vec<_>, Vec<_>) = st.queue.drain(..).partition(|r| r.at_ms <= now);
            st.queue = rest;
            for r in &due {
                st.fired.insert(r.key.clone());
            }
            due
        };
        for r in due {
            if now - r.at_ms > REMINDER_GRACE_MS {
                continue;
            }
            let _ = app.notification().builder().title(&r.title).body(&r.body).show();
            // L'interface mémorise la clé pour ne pas renotifier après un redémarrage.
            let _ = app.emit("reminder://fired", &r.key);
        }
    });
}

/// La croix de la grande fenêtre cache l'application dans la zone de notification (au lieu de quitter).
/// Valeur pilotée par le réglage côté interface (commande `set_close_to_tray`).
struct CloseToTray(AtomicBool);

#[tauri::command]
fn set_close_to_tray(state: tauri::State<CloseToTray>, enabled: bool) {
    state.0.store(enabled, Ordering::Relaxed);
}

/// Ré-affiche la grande fenêtre (et le mini s'il existe).
#[cfg(desktop)]
fn show_app(app: &AppHandle) {
    for label in ["main", "mini"] {
        if let Some(w) = app.get_webview_window(label) {
            let _ = w.show();
            if label == "main" {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }
    }
}

/// Cache toutes les fenêtres : l'application continue de tourner (rappels, synchronisation).
#[cfg(desktop)]
fn hide_app(app: &AppHandle) {
    for label in ["main", "mini"] {
        if let Some(w) = app.get_webview_window(label) {
            let _ = w.hide();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Relancer l'application ré-affiche l'instance déjà ouverte au lieu d'en créer une deuxième.
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_app(app)))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))
            // Mises à jour : vérification, téléchargement signé, installation puis redémarrage.
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder = builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        // Téléchargement des emplois du temps (.ics) sans blocage CORS
        .plugin(tauri_plugin_http::init())
        // Ouvrir un lien dans le navigateur (téléchargement d'une nouvelle version sur téléphone…)
        .plugin(tauri_plugin_opener::init())
        .manage(CloseToTray(AtomicBool::new(true)))
        .manage(Reminders(Mutex::new(ReminderState::default())))
        .invoke_handler(tauri::generate_handler![set_close_to_tray, schedule_reminders]);

    #[cfg(desktop)]
    {
        builder = desktop_setup(builder);
    }

    builder
        .build(tauri::generate_context!())
        .expect("erreur au lancement de My Agenda")
        .run(|_app, _event| {
            // macOS : clic sur l'icône du Dock alors que la fenêtre est cachée → on la ré-affiche.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { has_visible_windows: false, .. } = _event {
                show_app(_app);
            }
        });
}

/// Ordinateur uniquement : rappels natifs, icône dans la zone de notification / barre des menus,
/// fermeture dans l'icône, démarrage discret.
#[cfg(desktop)]
fn desktop_setup(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder
        .setup(|app| {
            start_reminder_loop(app.handle().clone());

            // ── Icône dans la zone de notification ──
            let open = MenuItem::with_id(app, "open", "Ouvrir My Agenda", true, None::<&str>)?;
            let mini = MenuItem::with_id(app, "mini", "Afficher / masquer le mini", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quitter My Agenda", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &mini, &sep, &quit])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().cloned().expect("icône manquante"))
                .tooltip("My Agenda")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_app(app),
                    // Le mini est piloté par l'interface (taille, position mémorisées…)
                    "mini" => {
                        let _ = app.emit_to("main", "tray://toggle-mini", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_app(tray.app_handle());
                    }
                })
                .build(app)?;

            // Lancé à l'ouverture de session : on reste discret (zone de notification / barre des menus).
            if std::env::args().any(|a| a == "--minimized") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            match event {
                // Croix / Alt+F4 sur la grande fenêtre
                WindowEvent::CloseRequested { api, .. } => {
                    let app = window.app_handle();
                    if app.state::<CloseToTray>().0.load(Ordering::Relaxed) {
                        api.prevent_close();
                        hide_app(app);
                    }
                }
                // Fermeture réelle de la grande fenêtre : on quitte tout, mini compris.
                WindowEvent::Destroyed => window.app_handle().exit(0),
                _ => {}
            }
        })
}
