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

À faire une seule fois : les mises à jour suivantes s'installent depuis l'application (Réglages → Mises à jour).
