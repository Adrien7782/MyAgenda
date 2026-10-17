/** Déclenche le téléchargement d'un fichier texte généré côté client. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  // Lien ajouté à la page le temps du clic (Firefox et certains WebView l'exigent pour garder le nom du fichier).
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileAsText(file: File): Promise<string> {
  return file.text();
}

/**
 * Partage d'un fichier texte : sur téléphone / tablette, la feuille de partage du système
 * (Messages, Mail, WhatsApp, Fichiers…) ; ailleurs, téléchargement classique.
 * Renvoie 'shared', 'downloaded' ou 'cancelled' (partage fermé par l'utilisateur).
 */
export async function shareOrDownloadText(filename: string, content: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const mime = 'text/plain;charset=utf-8';
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
  try {
    const file = new File([content], filename, { type: 'text/plain' });
    if (touch && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename.replace(/\.txt$/, '') });
      return 'shared';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    // Partage indisponible : on télécharge.
  }
  downloadTextFile(filename, content, mime);
  return 'downloaded';
}

/** Copie dans le presse-papiers ; false si le navigateur le refuse. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Ancienne méthode (WebView sans accès au presse-papiers moderne).
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
