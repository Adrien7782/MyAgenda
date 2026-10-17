import { noteToPlainText, noteFileName, noteToTxt, type Note } from '../../domain/note/note';
import { copyText, shareOrDownloadText } from '../../infrastructure/files/download';

/** Télécharge la note en .txt (ou ouvre le partage du téléphone). Renvoie un message pour l'utilisateur. */
export async function exportNote(note: Note): Promise<string | null> {
  const result = await shareOrDownloadText(noteFileName(note), noteToTxt(note));
  if (result === 'downloaded') return `« ${noteFileName(note)} » téléchargé`;
  return null;
}

export async function copyNote(note: Note): Promise<string> {
  const ok = await copyText(noteToTxt(note).replace(/\r\n/g, '\n'));
  return ok ? 'Texte copié' : 'Copie impossible sur cet appareil';
}

export function plainLength(note: Note): number {
  return noteToPlainText(note.content).length;
}
