# Nouveautés de My Agenda

Écris ici ce qui change **avant** de publier une version (`npm version …`).
La section de la version publiée s'affiche dans l'application, dans Réglages → Mises à jour.

## 1.1.0

- **Commande vocale** (Windows et Mac) : bouton micro ou Ctrl+Maj+Espace (⌘+Maj+Espace sur Mac), même application cachée. Crée des notes, des tâches et des évènements à la voix avec des phrases guidées en français (« Crée-moi une note. Titre : … Contenu : … Stop »), titre et contenu dictables en français, anglais ou espagnol. « Annule », « éteins-toi ». Reconnaissance 100 % locale (Whisper), modèle téléchargé une fois.
- **Notes** : une nouvelle page pour garder tes idées et tout ce qu'il faut retenir. Titre, texte mis en forme (titres, gras, italique, souligné, barré, surligné, listes, cases à cocher, citations), enregistrement automatique, recherche, notes épinglées et colorées, téléchargement en .txt (ou partage sur téléphone), corbeille. Synchronisées sur tous tes appareils.
- **Évènements répétés** : chaque jour, chaque semaine, chaque mois ou chaque année, avec une date de fin si besoin. Un rappel sonne à chaque occurrence.
- **12 nouvelles couleurs** pour les évènements (plus vives, bien lisibles sur les thèmes clairs).

## 1.0.2

- **My Agenda sur iPhone, iPad et dans tous les navigateurs** : une web app, à ajouter à l'écran d'accueil. Mêmes données grâce à ton compte, fonctionne hors ligne, toujours à jour à l'ouverture.
- Sur iPad et tablette Android, l'interface ordinateur remplace l'interface téléphone.
- Web app : import d'un emploi du temps par lien iCal grâce au relais Supabase « ics-proxy » (voir SETUP_SUPABASE.md).

## 1.0.1

- Correction : une seule notification par rappel. L'alerte « Échéance atteinte » envoyée en plus du rappel est supprimée (ordinateur et téléphone).

## 1.0.0

- **My Agenda sur Android** : l'application s'installe sur ton téléphone (fichier APK), avec une interface pensée pour le doigt : onglets en bas, calendrier compact, fenêtres plein écran, bouton « + » flottant.
- Sur téléphone, les rappels sont confiés à Android : ils sonnent à l'heure même si l'application est fermée.
- Une tâche peut maintenant être mise à la corbeille depuis sa fenêtre de modification.
- **Évènements sur plusieurs jours** : « Journée(s) entière(s) » du … au … (voyage, vacances, congés), affichés en une barre continue dans les vues Semaine et Mois.
- **3 nouveaux thèmes** : Rose & blanc, Rose & noir, Jaune & blanc.
- Téléphone : agenda en Mois / Semaine / Jour, on passe d'une période à l'autre en **glissant le doigt** ; nouveau mois plein écran ; semaine sur toute la largeur ; la liste des tâches remplace le Kanban.

## 0.7.2

- La nouvelle icône s'affiche aussi dans la barre des tâches (Windows gardait l'ancienne en mémoire).

## 0.7.1

- Correction : l'installation de la mise à jour depuis l'application échouait (« Aucune version publiée »).

## 0.7.0

- Nouveau **mode Concentration** : un grand compte à rebours réglable (heures, minutes ou durées rapides) entouré d'une jauge circulaire. Pause, reprise, +5 min ; notification et petit carillon à la fin, même application cachée.
- My Agenda Mini : bascule entre le **tableau de bord** et le **compte à rebours**. Pendant une séance, le mini affiche le compte à rebours par défaut.
- **My Agenda sur Mac** (Intel et Apple Silicon) : boutons de fenêtre natifs, icône dans la barre des menus, mises à jour automatiques comme sous Windows.

## 0.6.0

- Mises à jour automatiques : l'application te prévient quand une nouvelle version sort et l'installe en un clic (Réglages → Mises à jour).
- Installeur Windows téléchargeable depuis la page Releases du dépôt GitHub.

## 0.5.0

- Rappels sur les tâches et les évènements : X minutes avant, ou à une date précise. La notification arrive même quand l'application est cachée dans la zone de notification.
- Une tâche liée à un évènement prend automatiquement l'heure de début de l'évènement.
- Les tâches sont colorées par priorité dans l'agenda.
