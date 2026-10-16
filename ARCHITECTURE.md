# My Agenda — architecture

Application desktop Tauri 2 + React + TypeScript, multi-utilisateur.
- **Comptes** : Supabase Auth (email + mot de passe, vérification par code email) — configuration dans `SETUP_SUPABASE.md`.
- **Données locales** : une base SQLite **par compte** dans `%APPDATA%\com.flux.desktop\` (`user-xxxx.db`,
  `flux.db` = base d'avant les comptes, rattachée au 1er compte qui l'accepte). L'app marche hors ligne.
- **Synchronisation** : Supabase (tables `tasks`, `events`, règles RLS par utilisateur) — `supabase/schema.sql`.

## Lancer

```powershell
copy .env.example .env   # puis renseigner l'URL et la clé Supabase (voir SETUP_SUPABASE.md)
npm install
npm run tauri dev     # application complète (vraie base SQLite)
npm run dev           # interface seule dans le navigateur (données de démo)
npm test              # tests unitaires (vitest)
npm run typecheck     # vérification TypeScript
npm version patch     # publier une version : voir RELEASE.md (GitHub construit et signe le .exe)
```

## Couches (`src/`)

Les dépendances vont toujours vers le bas : une couche n'importe jamais une couche au-dessus.

| Dossier | Rôle | Peut importer |
|---|---|---|
| `pages/` | Pages fines : assemblent des widgets | tout ce qui est en dessous |
| `widgets/` | Blocs d'interface par fonctionnalité (tâches, agenda, progression, réglages…) | store, shared, domain |
| `store/` | État de l'app (Zustand) : appelle les services et garde le résultat | services (via `app/container`), domain |
| `services/` | Cas d'usage : créer une tâche, importer un .ics, synchroniser… `ports.ts` définit les interfaces attendues | domain |
| `infrastructure/` | Implémentations concrètes : SQLite, mémoire, Supabase, Tauri, HTTP, parseur .ics | services/ports, domain |
| `domain/` | Entités et règles métier pures (aucune dépendance React/Tauri) | rien |
| `shared/` | Composants UI génériques (`ui/`), icônes, hooks, styles, libellés | domain (types) |
| `app/` | Démarrage, routes et **`container.ts`** : le seul fichier qui choisit SQLite (Tauri) ou la mémoire (navigateur) | tout |

## Deux fenêtres, une seule application

La grande fenêtre (`main`) et **My Agenda Mini** (`mini`) chargent le même code ; `main.tsx`
détecte le rôle de la fenêtre (`infrastructure/tauri/windowRole.ts`).
- Chaque fenêtre a ses propres stores mais lit la même base SQLite.
- Après chaque modification, le store publie sur le `ChangeBus` (`services/ports.ts`) ;
  l'autre fenêtre reçoit le message et relit la donnée (`app/useAppBootstrap.ts`).
- Seule la grande fenêtre fait les tâches de fond (sync cloud, rappels, actualisation des .ics).
- Fermer la grande fenêtre la cache dans la zone de notification (ou quitte, selon le réglage) — `src-tauri/src/lib.rs`.
- Dans le navigateur : `http://localhost:5173/?window=mini` affiche le mini.

## Comptes, bases locales et synchronisation

```
Connexion (AuthScreen) ──► authService ──► AccountRegistry : compte → fichier de base (localStorage)
                                       └─► LocalDatabases.select(fichier) : toutes les requêtes SQLite visent ce fichier
syncService (toutes les 30 s, au retour du réseau)
  PUSH  lignes locales modifiées depuis la dernière sync (pierres tombales de suppression comprises)
  PULL  lignes serveur dont `synced_at` (horloge SERVEUR) > curseur → insensible aux horloges des PC
  conflit : `updated_at` le plus récent gagne
```
- Suppressions : `tasks.is_deleted = 2` / `events.is_deleted = 1` sont des pierres tombales synchronisées.
- La session Supabase est mémorisée localement : l'app redémarre connectée, même hors ligne.
- Mode navigateur sans `.env` : pas d'écran de connexion, données de démo en mémoire.

## Rappels et notifications

- Règles pures dans `domain/reminder/reminder.ts` : un rappel est soit `reminder_offset_min`
  (minutes avant l'échéance d'une tâche / le début d'un évènement), soit `reminder_at` (date fixe).
  `planReminders()` calcule les notifications des 48 h à venir, plus les alertes automatiques
  (30 min avant une échéance, à l'échéance, 15 min avant un évènement personnel).
- `services/reminderService.ts` envoie ce planning au **planificateur Rust** (`schedule_reminders`
  dans `src-tauri/src/lib.rs`). Un thread vérifie toutes les 5 s et affiche la notification Windows,
  même quand la fenêtre est cachée dans la zone de notification. Il émet `reminder://fired` pour que
  l'app mémorise les rappels envoyés (réglage `reminders_fired`) et ne les renvoie jamais.
- Le planning est recalculé à chaque modification de tâche/évènement et toutes les 10 min.
- Seul cas sans notification : l'application est complètement quittée.
- Une tâche liée à un évènement prend automatiquement le début de l'évènement comme échéance
  (`deadlineFromEvent`), et suit l'évènement s'il est déplacé ou ré-importé (`tasksToRealign`).

## Mode concentration

- `domain/focus/focus.ts` : la séance mémorise son **heure de fin** (`endsAt`) plutôt qu'un décompte,
  donc la grande fenêtre et le mini affichent exactement le même temps, même après un redémarrage.
- `store/focusStore.ts` : séance enregistrée dans le réglage `focus_session`, diffusée sur le canal `focus`.
- Fin de séance : notification via le planificateur Rust des rappels (`focusEndNotification`),
  carillon joué par le mini s'il est ouvert, sinon par la grande fenêtre (`useFocusWatcher`).
- Interface : `widgets/focus/` (jauge `FocusDial`, `FocusTimer` en version page ou compacte),
  `pages/FocusPage.tsx`, onglets du mini dans `widgets/mini/MiniContent.tsx`.

## Mises à jour et publication

- `tauri-plugin-updater` + `tauri-plugin-process` ; configuration dans `tauri.conf.json → plugins.updater`
  (clé publique, adresse `…/releases/latest/download/latest.json` complétée par le workflow GitHub).
- `infrastructure/tauri/tauriUpdater.ts` (port `Updater`) → `services/updateService.ts`
  (notification une fois par version) → `store/updateStore.ts` → `widgets/updates/`
  (bandeau, section Réglages). Vérification 8 s après le démarrage puis toutes les 6 h.
- La version vient de `package.json` (`tauri.conf.json` y renvoie, `__APP_VERSION__` côté interface).
- Publication : `.github/workflows/release.yml` sur un tag `v*` → installeur NSIS signé + `latest.json`.
  Mode d'emploi complet : [RELEASE.md](RELEASE.md).
- **macOS** : `src-tauri/tauri.macos.conf.json` (fusionné automatiquement sur Mac) remplace la barre
  de titre sans bordure par la barre native transparente (pastilles à gauche) ; l'interface s'adapte
  via `infrastructure/platform.ts` (`hasNativeMacControls`, libellés `OS_TEXT`). App signée « ad hoc »
  (`bundle.macOS.signingIdentity = "-"`), non notarisée : déblocage manuel au 1er lancement (RELEASE.md).
  Clic sur l'icône du Dock → `RunEvent::Reopen` ré-affiche la fenêtre cachée.

## Zone de notification

La croix cache l'app (réglage `close_to_tray`, appliqué côté Rust via la commande `set_close_to_tray`) :
rappels et synchronisation continuent. Icône : clic = ouvrir, clic droit = Ouvrir / Mini / Quitter.
Option « Lancer au démarrage de Windows » (`tauri-plugin-autostart`, argument `--minimized`).

## Icône

Source : `src-tauri/icons/app-icon.svg` (et `app-icon-macos.svg`, la même avec la marge de la grille macOS).
Après modification : `npx tauri icon src-tauri/icons/app-icon.svg`, puis
`npx tauri icon src-tauri/icons/app-icon-macos.svg -o tmp-icons` et copier `tmp-icons/icon.icns`
dans `src-tauri/icons/`. Le logo affiché dans l'application est `widgets/layout/AppLogo.tsx`.

## Où ajouter quoi ?

- Une nouvelle règle (ex. calcul de priorité) → `domain/`, avec un test dans `domain/__tests__`.
- Une nouvelle action (ex. dupliquer une tâche) → `services/taskService.ts`, puis `store/taskStore.ts`.
- Un nouvel écran → widgets dans `widgets/<fonctionnalité>/`, assemblage dans `pages/`.
- Une nouvelle colonne en base → migration numérotée dans `infrastructure/sqlite/database.ts` (ne jamais modifier une migration existante).

## Points d'attention

- Ne pas changer `identifier` dans `tauri.conf.json` ni le nom `flux.db` : la base serait recréée vide.
- Les évènements importés (`source_id` renseigné) ne sont pas envoyés à Supabase : ils sont re-téléchargés depuis leur lien.
- Couleurs d'évènements : règle par **titre** (réglage `event_title_colors`), donc conservée lors des ré-imports.
- Versions Tauri : `@tauri-apps/api`, la CLI et les plugins JS doivent rester sur le même x.y que les crates Rust
  (`Cargo.toml` les fige avec `~`). Sinon `tauri build` s'arrête et aucune version ne peut être publiée.
- Pièces jointes : seules les métadonnées (nom, taille) sont enregistrées pour l'instant.
