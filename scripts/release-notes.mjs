// Affiche la section de CHANGELOG.md correspondant à la version de package.json.
// Utilisé par le workflow de publication : ce texte devient la description de la
// Release GitHub et les « Nouveautés » affichées dans l'application.
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
let changelog = '';
try { changelog = readFileSync('CHANGELOG.md', 'utf8'); } catch { /* pas de changelog */ }

const lines = changelog.split(/\r?\n/);
const start = lines.findIndex((l) => new RegExp(`^##\\s*\\[?v?${version.replace(/\./g, '\\.')}\\]?(\\s|$)`).test(l));
let notes = '';
if (start !== -1) {
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  notes = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
}
console.log(notes || 'Améliorations et corrections.');
