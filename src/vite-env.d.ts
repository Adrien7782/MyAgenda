/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** « propriétaire/dépôt » GitHub des versions publiées (renseigné par le workflow de publication). */
  readonly VITE_GITHUB_REPOSITORY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Version de l'application (package.json), injectée par Vite. */
declare const __APP_VERSION__: string;

/** Vrai dans la construction « web app » (GitHub Pages), faux dans l'application installée et en développement. */
declare const __WEB_BUILD__: boolean;
