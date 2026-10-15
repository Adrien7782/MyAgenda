// Recopie la version de package.json dans src-tauri/Cargo.toml et Cargo.lock.
// Lancé automatiquement par `npm version` (script "version" de package.json),
// pour que la nouvelle version soit partout dans le même commit.
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const toml = 'src-tauri/Cargo.toml';
writeFileSync(toml, readFileSync(toml, 'utf8').replace(/^version = ".*"$/m, `version = "${version}"`));

const lock = 'src-tauri/Cargo.lock';
writeFileSync(lock, readFileSync(lock, 'utf8').replace(/(name = "flux"\r?\nversion = )".*"/, `$1"${version}"`));

console.log(`Version ${version} appliquée à Cargo.toml et Cargo.lock`);
