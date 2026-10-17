import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Deux constructions à partir du même code :
 * - application installée (Tauri) : `npm run build` (appelé par `tauri build`) ;
 * - web app (GitHub Pages) : `npm run build:web` → WEB_BUILD=1 et WEB_BASE=/<dépôt>/.
 */
const webBuild = process.env.WEB_BUILD === '1';
const base = webBuild ? (process.env.WEB_BASE ?? '/') : '/';

/** version.json : lu par la web app ouverte pour savoir qu'une nouvelle version est en ligne. */
function versionFile(): Plugin {
  return {
    name: 'my-agenda-version-file',
    apply: 'build',
    generateBundle() {
      if (!webBuild) return;
      let notes = '';
      try {
        const lines = readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf8').split(/\r?\n/);
        const start = lines.findIndex((l) => new RegExp(`^##\\s*\\[?v?${pkg.version.replace(/\./g, '\\.')}\\]?(\\s|$)`).test(l));
        if (start !== -1) {
          const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
          notes = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
        }
      } catch { /* pas de CHANGELOG */ }
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: pkg.version, notes, pub_date: new Date().toISOString() }, null, 2),
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    versionFile(),
    VitePWA({
      // Service worker uniquement pour la web app (pas dans Tauri, pas en développement).
      disable: !webBuild,
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: base,
        name: 'My Agenda',
        short_name: 'My Agenda',
        description: 'Tâches, agenda et rappels.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#030b18',
        theme_color: '#030b18',
        icons: [
          { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Toute l'application (dont la base SQLite en WebAssembly) est gardée pour fonctionner hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // version.json : toujours lu sur le serveur (c'est lui qui annonce une nouvelle version).
        navigateFallbackDenylist: [/version\.json$/],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __WEB_BUILD__: JSON.stringify(webBuild),
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Tauri : WebView récente. Web app : Safari 15+ (iPhone), Chrome, Firefox, Edge récents.
    target: webBuild ? ['safari15', 'chrome105', 'firefox110'] : 'chrome105',
    minify: 'esbuild',
    sourcemap: false,
  },
});
