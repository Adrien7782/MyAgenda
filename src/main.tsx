import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { detectWindowRole } from './infrastructure/tauri/windowRole';
import './shared/styles/globals.css';

// La même application sert deux fenêtres : la grande ("main") et "My Agenda Mini".
detectWindowRole().then((role) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App role={role} />
    </React.StrictMode>,
  );
});
