# Configurer les comptes et la synchronisation (Supabase)

Compter environ 15 minutes. Tout est gratuit pour un usage personnel ou un petit groupe.

## 1. Créer le projet
1. Crée un compte sur https://supabase.com, puis **New project**.
   - Région : *West EU (Paris)* ou la plus proche.
   - Note le mot de passe de la base quelque part (il ne sert pas à l'application).
2. Attends 1 à 2 minutes que le projet soit prêt.

## 2. Créer les tables et la sécurité
1. Menu de gauche → **SQL Editor** → **New query**.
2. Copie-colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql), puis **Run**.
   Le script crée les tables `tasks` et `events`, l'horodatage serveur et les règles **RLS**
   (chaque utilisateur ne voit que ses propres lignes). Tu peux le relancer sans risque.

   **Mise à jour de l'application ?** Relance le script après chaque nouvelle version :
   par exemple la 0.5 ajoute les colonnes `reminder_offset_min` et `reminder_at` (rappels).
   Sans elles, la synchronisation affiche une erreur « colonne manquante ».

## 3. Vérification de l'adresse email
**Authentication → Sign In / Providers → Email** : vérifie que **Confirm email** est activé,
et mets **Minimum password length** à 8.

### Option A — tout de suite, sans rien configurer (pour tester seul)
Garde le modèle d'email par défaut : il envoie un **lien**. Dans l'application, après la création du compte,
clique sur le lien reçu, puis sur **« J'ai cliqué sur le lien de l'email »**.
- La page qui s'ouvre dans le navigateur peut afficher une erreur : c'est normal, la confirmation est déjà faite.
  Pour une page plus propre : **Authentication → URL Configuration → Site URL** = par ex. l'adresse de ton dépôt GitHub.
- Limites du service d'email intégré : il n'envoie **qu'aux membres de ton équipe Supabase**, quelques emails par heure,
  et « Mot de passe oublié » (qui utilise un code) ne fonctionne pas sans l'option B.

## 4. Option B — vrai service d'email (obligatoire dès que d'autres personnes s'inscrivent)
Configurer un SMTP gratuit débloque aussi la modification des modèles d'email (pas besoin de l'offre Pro).
1. Crée un compte gratuit sur **Brevo** (300 emails/jour) → **SMTP & API** → génère une **clé SMTP**,
   et ajoute ton adresse comme **expéditeur** (Senders) puis valide-la.
2. Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP** :
   - Host `smtp-relay.brevo.com` · Port `587`
   - Username : l'identifiant SMTP affiché par Brevo · Password : la clé SMTP
   - Sender email : l'adresse validée chez Brevo · Sender name : `My Agenda`
3. **Authentication → Rate Limits** : monte « emails per hour » (ex. 30).
4. **Authentication → Emails → Templates** (maintenant modifiables), pour envoyer un **code** :
   - **Confirm signup** :
     ```html
     <h2>Bienvenue sur My Agenda</h2>
     <p>Ton code de vérification : <strong style="font-size:24px">{{ .Token }}</strong></p>
     <p>Il expire dans 1 heure.</p>
     ```
   - **Reset Password** :
     ```html
     <h2>Nouveau mot de passe</h2>
     <p>Ton code : <strong style="font-size:24px">{{ .Token }}</strong></p>
     ```
   L'application accepte les deux : le code (plus pratique) ou le lien.

## 5. Brancher l'application
1. Supabase → **Project Settings → API** : copie **Project URL** et la clé **anon public**.
2. À la racine du projet (`flux/`), copie `.env.example` en `.env` et colle les deux valeurs.
3. Relance `npm run tauri dev`. L'écran de connexion apparaît.

> La clé *anon* est publique par conception (elle est incluse dans l'application installée).
> La sécurité vient des règles RLS du script SQL. Ne mets **jamais** la clé *service_role* dans l'application.
> Le fichier `.env` est exclu de Git : tes valeurs ne seront pas publiées sur GitHub.

## Vérifier que tout fonctionne
- Crée un compte dans l'application → saisis le code reçu par email.
- Ajoute une tâche → Supabase → **Table Editor → tasks** : la ligne apparaît (avec ton `user_id`) après quelques secondes.
- Connecte-toi avec le même compte sur un autre PC : la tâche y apparaît.
- Réglages → **Stockage des données** : chemin et contenu de la base locale de ton compte.
