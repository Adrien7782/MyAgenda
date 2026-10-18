# Publier My Agenda sur GitHub et livrer les mises à jour

Résumé : le code est sur GitHub. Quand tu envoies un **tag de version** (`v0.6.1`…),
GitHub construit l'installeur **Windows** (.exe), **macOS** (.dmg) et l'application **Android** (.apk), les signe et les publie dans **Releases**,
puis met en ligne la **web app** (iPhone, iPad, tout navigateur) sur GitHub Pages, avec le même numéro de version.
Les applications installées le voient (au démarrage puis toutes les 6 h) et proposent
la mise à jour : notification, bandeau, bouton dans **Réglages → Mises à jour**.

---

## 1. Une seule fois : créer le dépôt

1. Sur github.com → **New repository** → nom `my-agenda` → **Public** → ne coche rien
   (pas de README, pas de .gitignore) → **Create repository**.
2. Dans un terminal, dans le dossier `flux` :

   ```bash
   git init -b main
   git add .
   git status          # vérifie : PAS de .env, PAS de node_modules, PAS de clé
   git commit -m "My Agenda 0.6.0"
   git remote add origin https://github.com/TON-PSEUDO/my-agenda.git
   git push -u origin main
   ```

   `.gitignore` exclut déjà `.env` (adresse et clé Supabase), `node_modules`, `target`
   et les fichiers de clé.

## 2. Une seule fois : les 4 secrets

Sur GitHub : dépôt → **Settings → Secrets and variables → Actions → New repository secret**.

| Nom | Valeur |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | tout le contenu du fichier `D:\ToDoList\_cles-my-agenda\my-agenda.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | le contenu de `D:\ToDoList\_cles-my-agenda\mot-de-passe-cle.txt` |
| `VITE_SUPABASE_URL` | la même valeur que dans ton fichier `.env` |
| `VITE_SUPABASE_ANON_KEY` | la même valeur que dans ton fichier `.env` |

> ⚠️ **Sauvegarde le dossier `_cles-my-agenda`** (clé USB, gestionnaire de mots de passe…).
> Si tu perds la clé, les applications déjà installées n'accepteront plus aucune mise à jour :
> tout le monde devra réinstaller à la main. Ne la mets jamais dans le dépôt.

La clé **publique** correspondante est déjà dans `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`) :
l'application refuse tout installeur qui n'a pas été signé avec ta clé privée.

### Secrets Android (2 de plus)

| Nom | Valeur |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | tout le contenu de `D:\ToDoList\_cles-my-agenda\my-agenda-android.jks.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | le contenu de `D:\ToDoList\_cles-my-agenda\mot-de-passe-android.txt` |

> ⚠️ Même règle que pour la clé de mise à jour : **ne perds jamais `my-agenda-android.jks`**.
> Android n'installe une nouvelle version par-dessus l'ancienne que si elle est signée avec la même clé.

### Web app : GitHub Pages (2 réglages)

1. **Settings → Pages** → *Build and deployment* → **Source : GitHub Actions**.
2. **Settings → Environments → github-pages** (il apparaît après l'étape 1) → *Deployment branches and tags* :
   laisse `main`, puis **Add deployment branch or tag rule** → *Ref type* : **Tag** → nom : `v*` → **Add rule**.
   Sans cette règle, GitHub refuse de publier la web app depuis un tag de version.
3. Première mise en ligne sans attendre la prochaine version : **Actions → Web app → Run workflow** (branche `main`).

Adresse de la web app : **https://TON-PSEUDO.github.io/NOM-DU-DEPOT/** (affichée à la fin du workflow).
Elle utilise les mêmes secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` : rien d'autre à configurer dans Supabase.

## 3. Publier une version

**Toute première version (0.6.0, déjà dans package.json)** : onglet **Actions → Publier une version
→ Run workflow**. Le workflow crée lui-même le tag `v0.6.0`. Installe ensuite cet .exe sur ton PC :
c'est à partir de lui que les mises à jour suivantes arriveront.

**Versions suivantes :**

1. Écris les nouveautés dans `CHANGELOG.md`, sous un titre `## 0.6.1`
   (c'est ce texte qui s'affiche dans l'application). Commit.
2. Puis :

   ```bash
   npm version patch        # 0.6.0 → 0.6.1 (minor : 0.7.0, major : 1.0.0)
   git push --follow-tags
   ```

   `npm version` met la version à jour partout (package.json, Cargo.toml), fait le commit
   et crée le tag `v0.6.1`. L'envoi du tag lance le workflow **Publier une version**.
3. Suis la construction dans l'onglet **Actions** : 3 étapes (`prepare` → `build (Windows)` et
   `build (macOS)` en parallèle → `publish`), environ 15 à 25 min, plus rapide les fois suivantes.
   La Release reste en **brouillon** tant que tout n'a pas réussi : personne ne reçoit une version
   à moitié construite. À la fin, elle apparaît dans **Releases** avec :
   - `My.Agenda_0.6.1_x64-setup.exe` — l'installeur Windows ;
   - `My.Agenda_0.6.1_universal.dmg` — l'installeur Mac (Intel et Apple Silicon) ;
   - `.sig`, `.app.tar.gz` et `latest.json` — utilisés par la mise à jour automatique ;
   - et, dans la description, le mode d'emploi d'installation (texte de `.github/release-install.md`).

   Si une étape échoue, corrige puis relance : **Actions → la publication ratée → Re-run all jobs**
   (le brouillon est réutilisé).

Un simple `git push` (sans tag) ne publie rien : il lance seulement les vérifications
(types, tests, compilation).

### Tester Android avant de publier

Envoie ta branche (`git push`, sur une branche autre que `main`) : l'APK de test se construit tout seul
(onglet **Actions → Android (APK)**, ou **Run workflow** une fois le fichier présent sur `main`). Après ~15 min, ouvre l'exécution :
en bas, rubrique **Artifacts**, télécharge `my-agenda-android-test` (un .zip qui contient l'APK),
envoie l'APK sur ton téléphone (câble USB, Google Drive, mail…) et installe-le comme ci-dessous.
Rien n'est publié : tes utilisateurs ne voient rien.

## 4. Installer chez un nouvel utilisateur

Envoie-lui le lien `https://github.com/TON-PSEUDO/my-agenda/releases/latest`.

### Windows

Il télécharge `My.Agenda_…_x64-setup.exe` et l'exécute (pas besoin de droits administrateur).
Windows affichera sans doute **« Windows a protégé votre ordinateur »** : l'installeur
n'a pas de certificat de signature Microsoft (payant). Clique **Informations complémentaires
→ Exécuter quand même**.

### macOS (Intel et Apple Silicon)

1. Télécharger `My.Agenda_…_universal.dmg`, l'ouvrir, glisser **My Agenda** sur le dossier **Applications**.
2. Débloquer l'application **une seule fois** : elle n'est pas certifiée par Apple (il faudrait le
   programme développeur Apple, 99 $/an), donc macOS refuse de l'ouvrir. Deux façons :

   **A. Avec le Terminal (le plus simple)** — ouvrir Terminal (⌘ Espace, taper « Terminal »),
   coller cette commande puis Entrée :

   ```bash
   xattr -dr com.apple.quarantine "/Applications/My Agenda.app"
   ```

   Puis ouvrir My Agenda normalement depuis Applications ou le Launchpad.

   **B. Sans Terminal** — double-cliquer sur My Agenda : un message dit qu'Apple ne peut pas
   vérifier l'app → **Terminé**. Puis **Réglages Système → Confidentialité et sécurité**,
   descendre jusqu'à « My Agenda a été bloqué » → **Ouvrir quand même** → mot de passe du Mac
   → **Ouvrir**.

3. Au premier lancement, accepter les **notifications** quand macOS le demande (sinon :
   Réglages Système → Notifications → My Agenda).

Sur Mac, les boutons de fenêtre sont les pastilles habituelles, à gauche. Fermer la fenêtre
garde l'application active (icône dans la barre des menus, en haut de l'écran) : les rappels
continuent. Pour quitter : **⌘Q**.

Ces messages n'apparaissent qu'à la première installation : les mises à jour suivantes
passent par l'application, sans rien débloquer.

### Android

1. Sur le téléphone, ouvrir `https://github.com/TON-PSEUDO/my-agenda/releases/latest` dans le navigateur
   (Chrome…) et toucher `My.Agenda_…_android.apk`.
2. Une fois le téléchargement fini, toucher le fichier (notification « Téléchargement terminé » ou
   application **Fichiers → Téléchargements**).
3. Android refuse d'abord : **Paramètres → Autoriser cette source** (autorise le navigateur à installer
   des applications), puis revenir et toucher **Installer**.
4. Si **Play Protect** affiche « Application inconnue » : **Plus de détails → Installer quand même**
   (l'application n'est pas sur le Play Store, c'est normal).
5. Au premier lancement, **autoriser les notifications** (sinon pas de rappels).

Sur Android, les mises à jour ne s'installent pas toutes seules : **Réglages → Mises à jour →
Télécharger la mise à jour** ouvre le nouvel APK dans le navigateur, il suffit de le toucher puis
**Mettre à jour**. Les données sont conservées (même clé de signature).

### iPhone et iPad : la web app

1. Sur l'iPhone, ouvre **https://TON-PSEUDO.github.io/NOM-DU-DEPOT/** dans **Safari**.
2. Touche **Partager** (carré avec une flèche) → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvre My Agenda depuis sa nouvelle icône (plein écran, comme une application), connecte-toi avec ton compte.
4. **Réglages → Notifications → Autoriser les notifications** pour recevoir les rappels.

Limites de la web app (imposées par iOS et les navigateurs) :
- les rappels s'affichent **seulement quand My Agenda est ouverte** (au premier plan sur iPhone) ;
- le lien d'un emploi du temps (.ics) passe par le relais Supabase `ics-proxy` : à installer une fois
  (SETUP_SUPABASE.md, section 6), sinon le site de l'université refuse la lecture du lien ;
- pas de mini ni de lancement au démarrage.

Mises à jour : rien à faire. À chaque ouverture, la web app vérifie la version en ligne et se recharge
dessus si besoin (écran « Mise à jour de My Agenda… » pendant une ou deux secondes).

### iPhone : application native (plus tard)

Le code est prêt pour iOS (interface téléphone, rappels programmés dans le système, 60 au maximum
comme l'impose iOS). Il manque la partie Apple, qui demande un **compte Apple Developer (99 $/an)** :
1. Sur un Mac avec Xcode : `npx tauri ios init`, puis choisir l'équipe (Team) du compte développeur.
2. `npx tauri ios build` → fichier .ipa, envoyé sur **App Store Connect** puis distribué par
   **TestFlight** (lien d'invitation) ou l'App Store.
3. Ajouter ensuite une étape iOS au workflow GitHub (runner macOS + certificats en secrets).

## 5. Ce que voit l'utilisateur quand une version sort

- une notification « Nouvelle version disponible » (une seule fois par version) ;
- un bandeau en haut de l'application et une pastille sur l'icône Réglages ;
- dans **Réglages → Mises à jour** : les nouveautés et **Installer et redémarrer**.
  L'application synchronise, télécharge, installe puis se relance. Les données ne bougent pas
  (elles sont dans `%APPDATA%\com.flux.desktop` sous Windows,
  `~/Library/Application Support/com.flux.desktop` sur Mac — pas dans le dossier du programme).

## Dépannage

- **`npm run tauri dev` : la commande vocale compile Whisper (C++) et a besoin de deux outils**, à installer une fois
  (puis rouvrir le terminal) :
  - Windows : `winget install Kitware.CMake` et `winget install LLVM.LLVM`
  - Mac : `brew install cmake` (clang est déjà fourni par les outils Xcode)
  Erreurs typiques sans eux : « is `cmake` not installed? », « Unable to find libclang », ou
  « attempt to compute `12_usize - 16_usize` » dans `bindings.rs`. Après installation :
  `cd src-tauri`, `cargo clean -p whisper-rs-sys`, `cd ..`, puis `npm run tauri dev`.
- **Tester avant de publier** : chaque envoi sur une branche (autre que main) construit une app de test Windows + Mac,
  à télécharger dans Actions → « Ordinateur (test) » → Artifacts.

- **Web app : le workflow échoue à « deploy » avec « not allowed to deploy to github-pages »** →
  la règle de tag `v*` manque (section *Web app : GitHub Pages*, étape 2). Relance ensuite le job.
- **Web app : page 404** → Settings → Pages → Source doit être « GitHub Actions », puis relancer **Actions → Web app**.

- **Le workflow échoue à « Vérifier les secrets »** → un des 4 secrets manque ou est mal nommé.
- **« Le tag ne correspond pas à la version »** → crée les versions avec `npm version`,
  pas avec `git tag` à la main.
- **L'application dit « Aucune version publiée »** → aucune Release n'existe encore,
  ou la dernière est en brouillon / pré-version.
- **« n'est pas signée par l'auteur »** → la clé privée des secrets ne correspond pas à la clé
  publique de `tauri.conf.json` (clé régénérée ?).
- **Seul `build (macOS)` échoue** → la Release reste en brouillon, rien n'est publié.
  Envoie la capture de l'erreur ; en attendant, tu peux publier le brouillon à la main
  (Releases → Edit → Publish) pour les utilisateurs Windows… mais sans `latest.json`,
  les applications ne verront pas la mise à jour : mieux vaut corriger et relancer.
- **Android échoue mais Windows/macOS réussissent** → la version est quand même publiée, sans APK
  (avertissement dans l'étape `publish`). Corrige, puis publie une nouvelle version.
- **Android : « Application non installée »** → l'APK n'est pas signé avec la même clé que la version
  déjà installée (secrets Android modifiés ?). Il faut désinstaller puis réinstaller (les données
  locales du téléphone sont perdues, celles synchronisées avec ton compte reviennent).
- **Mac : « My Agenda est endommagé et ne peut pas être ouvert »** → c'est le blocage de
  première installation : utiliser la commande `xattr` ci-dessus.
- En mode développement (`npm run tauri dev`), la recherche de mise à jour est désactivée.
