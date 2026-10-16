### Installer My Agenda

**Windows** — télécharge `My.Agenda_…_x64-setup.exe` ci-dessous et lance-le.
Si Windows affiche « Windows a protégé votre ordinateur » : **Informations complémentaires → Exécuter quand même**.

**macOS** (Intel et Apple Silicon) — télécharge `My.Agenda_…_universal.dmg`, ouvre-le et glisse **My Agenda** dans **Applications**.
L'application n'est pas certifiée par Apple : au premier lancement, macOS la bloque.

- Ouvre **Terminal** (⌘ Espace → « Terminal ») et colle cette commande, puis Entrée :

  ```
  xattr -dr com.apple.quarantine "/Applications/My Agenda.app"
  ```

- Ou sans Terminal : lance l'app une fois (message de blocage → **Terminé**), puis
  **Réglages Système → Confidentialité et sécurité** → en bas, **Ouvrir quand même** → confirme avec ton mot de passe.

**Android** — sur le téléphone, ouvre cette page dans le navigateur et touche `My.Agenda_…_android.apk`.
Une fois téléchargé, touche le fichier : Android demande d'autoriser l'installation depuis ce navigateur
(**Paramètres → Autoriser cette source**), puis **Installer**. Si Play Protect affiche un avertissement : **Installer quand même**.
Au premier lancement, autorise les **notifications** pour recevoir les rappels.

À faire une seule fois : les mises à jour suivantes s'installent depuis l'application (Réglages → Mises à jour).
