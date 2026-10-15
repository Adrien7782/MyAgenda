import { AuthLayout } from './AuthLayout';

/** Le serveur de comptes n'est pas configuré (fichier .env absent). */
export function UnconfiguredScreen() {
  const steps = [
    'Crée un projet gratuit sur supabase.com et exécute le script supabase/schema.sql (SQL Editor).',
    'Copie le fichier .env.example en .env, à la racine du projet.',
    'Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Supabase → Project Settings → API).',
    'Relance npm run tauri dev.',
  ];
  return (
    <AuthLayout title="Serveur de comptes non configuré" subtitle="My Agenda a besoin d'un projet Supabase pour gérer les comptes et la synchronisation.">
      <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Le guide pas à pas est dans <code>SETUP_SUPABASE.md</code>.</p>
    </AuthLayout>
  );
}
