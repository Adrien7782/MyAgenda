import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { isWebApp } from './app/container';
import { detectWindowRole } from './infrastructure/tauri/windowRole';
import { startPwa } from './infrastructure/web/pwa';
import { requestPersistentStorage } from './infrastructure/sqlite/webSqlite';
import { flushDb } from './infrastructure/sqlite/database';
import { WebTabGate } from './widgets/web/WebTabGate';
import './shared/styles/globals.css';

async function start() {
  if (isWebApp) {
    // Web app : une version plus récente est en ligne ? On passe dessus avant d'afficher quoi que ce soit.
    if (await startPwa()) return;
    void requestPersistentStorage();
    // Fermeture de l'onglet / passage en arrière-plan : tout est enregistré.
    const save = () => void flushDb().catch(() => undefined);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  }

  // La même application sert deux fenêtres : la grande ("main") et "My Agenda Mini".
  const role = await detectWindowRole();
  const app = <App role={role} />;
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {isWebApp ? <WebTabGate>{app}</WebTabGate> : app}
    </React.StrictMode>,
  );
}

void start();
