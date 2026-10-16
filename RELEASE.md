# Publier My Agenda sur GitHub et livrer les mises à jour

Résumé : le code est sur GitHub. Quand tu envoies un **tag de version** (`v0.6.1`…),
GitHub construit l'installeur **Windows** (.exe) et **macOS** (.dmg), les signe et les publie dans **Releases**.
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

## 5. Ce que voit l'utilisateur quand une version sort

- une notification « Nouvelle version disponible » (une seule fois par version) ;
- un bandeau en haut de l'application et une pastille sur l'icône Réglages ;
- dans **Réglages → Mises à jour** : les nouveautés et **Installer et redémarrer**.
  L'application synchronise, télécharge, installe puis se relance. Les données ne bougent pas
  (elles sont dans `%APPDATA%\com.flux.desktop` sous Windows,
  `~/Library/Application Support/com.flux.desktop` sur Mac — pas dans le dossier du programme).

## Dépannage

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
- **Mac : « My Agenda est endommagé et ne peut pas être ouvert »** → c'est le blocage de
  première installation : utiliser la commande `xattr` ci-dessus.
- En mode développement (`npm run tauri dev`), la recherche de mise à jour est désactivée.
