// Prépare le projet Android généré par `tauri android init` (dossier src-tauri/gen/android) :
//   1. signature de l'APK avec la clé de My Agenda (keystore fourni par les secrets GitHub) ;
//   2. permission « alarmes exactes » : les rappels sonnent à la minute près, même téléphone en veille ;
//   3. marges système : l'interface ne passe pas sous la barre d'état ni sous la barre de navigation.
//
// Utilisé par le workflow .github/workflows/android.yml. Usage :
//   node scripts/android-prepare.mjs <chemin du keystore> <mot de passe> <alias>
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [keystorePath, password, alias = 'my-agenda'] = process.argv.slice(2);
const root = 'src-tauri/gen/android';
if (!existsSync(root)) throw new Error(`${root} introuvable : lance d'abord "tauri android init".`);

function patch(file, edits) {
  let text = readFileSync(file, 'utf8');
  for (const [label, test, apply] of edits) {
    if (test(text)) { console.log(`= ${label} (déjà présent)`); continue; }
    const next = apply(text);
    if (next === text) throw new Error(`Impossible d'appliquer « ${label} » dans ${file} : le modèle Tauri a changé.`);
    text = next;
    console.log(`+ ${label}`);
  }
  writeFileSync(file, text);
}

function find(dir, name) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      const hit = find(p, name);
      if (hit) return hit;
    } else if (entry === name) return p;
  }
  return null;
}

// 1. Signature ────────────────────────────────────────────────────────────────
if (keystorePath) {
  writeFileSync(join(root, 'keystore.properties'), [
    `storeFile=${keystorePath.replace(/\\/g, '/')}`,
    `password=${password}`,
    `keyAlias=${alias}`,
  ].join('\n') + '\n');

  patch(join(root, 'app/build.gradle.kts'), [
    ['configuration de signature',
      (t) => t.includes('signingConfigs'),
      (t) => t.replace(/\n(\s*)buildTypes \{/, `
$1signingConfigs {
$1    create("release") {
$1        val keystoreProperties = Properties()
$1        val keystoreFile = rootProject.file("keystore.properties")
$1        if (keystoreFile.exists()) keystoreFile.inputStream().use { keystoreProperties.load(it) }
$1        keyAlias = keystoreProperties["keyAlias"] as String?
$1        keyPassword = keystoreProperties["password"] as String?
$1        storeFile = (keystoreProperties["storeFile"] as String?)?.let { file(it) }
$1        storePassword = keystoreProperties["password"] as String?
$1    }
$1}
$1buildTypes {`)],
    ['APK de publication signé',
      (t) => /getByName\("release"\)\s*\{\s*signingConfig/.test(t),
      (t) => t.replace(/getByName\("release"\)\s*\{/, 'getByName("release") {\n            signingConfig = signingConfigs.getByName("release")')],
    ['import Properties',
      (t) => /import java\.util\.Properties/.test(t),
      (t) => `import java.util.Properties\n${t}`],
  ]);
} else {
  console.log('Pas de keystore : APK non signé.');
}

// 2. Alarmes exactes ───────────────────────────────────────────────────────────
patch(join(root, 'app/src/main/AndroidManifest.xml'), [
  ['permission alarmes exactes',
    (t) => t.includes('USE_EXACT_ALARM'),
    (t) => t.replace(/(\s*)<application/, `$1<!-- Rappels à l'heure exacte (application d'agenda) -->
$1<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
$1<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />$1<application`)],
]);

// 3. Marges système (Android 15+ affiche les applications « bord à bord ») ──────
const mainActivity = find(join(root, 'app/src/main'), 'MainActivity.kt');
if (!mainActivity) throw new Error('MainActivity.kt introuvable.');
patch(mainActivity, [
  ['marges barre d’état / navigation / clavier',
    (t) => t.includes('setOnApplyWindowInsetsListener'),
    (t) => t
      .replace(/(import androidx\.activity\.enableEdgeToEdge)/, `$1
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat`)
      .replace(/(super\.onCreate\(savedInstanceState\))/, `$1
    // L'interface reste entre la barre d'état et la barre de navigation, et remonte au-dessus du clavier.
    val content = findViewById<android.view.View>(android.R.id.content)
    content.setBackgroundColor(android.graphics.Color.parseColor("#030b18"))
    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = false
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }`)],
]);

console.log('Projet Android prêt.');
