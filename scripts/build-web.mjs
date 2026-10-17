// Construit la web app dans dist/ (même code que l'application installée).
//   npm run build:web
// Sur GitHub, le site est servi depuis https://<compte>.github.io/<dépôt>/ : les adresses
// des fichiers doivent commencer par /<dépôt>/ (déduit de GITHUB_REPOSITORY, ou WEB_BASE).
import { build } from 'vite';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
process.env.WEB_BUILD = '1';
process.env.WEB_BASE ??= repo ? `/${repo}/` : '/';
console.log(`Web app → dist/ (adresse de base : ${process.env.WEB_BASE})`);
await build();
