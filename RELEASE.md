# Publier My Agenda sur GitHub et livrer les mises à jour

Résumé : le code est sur GitHub. Quand tu envoies un **tag de version** (`v0.6.1`…),
GitHub construit l'installeur Windows, le signe et le publie dans **Releases**.
Les applications installées le voient (au démarrage puis toutes les 6 h) et proposent
la mise à jour : notification Windows, bandeau, bouton dans **Réglages → Mises à jour**.

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
3. Suis la construction dans l'onglet **Actions** (environ 10 à 15 min, plus rapide ensuite).
   À la fin, la version apparaît dans **Releases** avec :
   - `My Agenda_0.6.1_x64-setup.exe` — l'installeur à télécharger ;
   - `.sig` et `latest.json` — utilisés par la mise à jour automatique.

Un simple `git push` (sans tag) ne publie rien : il lance seulement les vérifications
(types, tests, compilation).

## 4. Installer chez un nouvel utilisateur

Envoie-lui le lien `https://github.com/TON-PSEUDO/my-agenda/releases/latest`,
il télécharge `My Agenda_…_x64-setup.exe` et l'exécute (pas besoin de droits administrateur).

Windows affichera sans doute **« Windows a protégé votre ordinateur »** : l'installeur
n'a pas de certificat de signature Microsoft (payant). Clique **Informations complémentaires
→ Exécuter quand même**. Ce message n'apparaît qu'à la première installation, pas lors des
mises à jour.

## 5. Ce que voit l'utilisateur quand une version sort

- une notification Windows « Nouvelle version disponible » (une seule fois par version) ;
- un bandeau en haut de l'application et une pastille sur l'icône Réglages ;
- dans **Réglages → Mises à jour** : les nouveautés et **Installer et redémarrer**.
  L'application synchronise, télécharge, installe puis se relance. Les données ne bougent pas
  (elles sont dans `%APPDATA%\com.flux.desktop`, pas dans le dossier du programme).

## Dépannage

- **Le workflow échoue à « Vérifier les secrets »** → un des 4 secrets manque ou est mal nommé.
- **« Le tag ne correspond pas à la version »** → crée les versions avec `npm version`,
  pas avec `git tag` à la main.
- **L'application dit « Aucune version publiée »** → aucune Release n'existe encore,
  ou la dernière est en brouillon / pré-version.
- **« n'est pas signée par l'auteur »** → la clé privée des secrets ne correspond pas à la clé
  publique de `tauri.conf.json` (clé régénérée ?).
- En mode développement (`npm run tauri dev`), la recherche de mise à jour est désactivée.
