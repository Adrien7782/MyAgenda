import { DownloadIcon } from '../../shared/icons/Icons';
import { Button } from '../../shared/ui';
import { agendaToIcs, tasksToCsv } from '../../services/exportService';
import { downloadTextFile } from '../../infrastructure/files/download';
import { useTaskStore } from '../../store/taskStore';
import { useEventStore } from '../../store/eventStore';
import { useActiveNotes } from '../../store/noteStore';
import { noteToTxt } from '../../domain/note/note';

export function ExportSettings() {
  const tasks = useTaskStore((s) => s.tasks);
  const events = useEventStore((s) => s.events);
  const notes = useActiveNotes();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button icon={<DownloadIcon size={14} />} onClick={() => downloadTextFile('my-agenda-taches.csv', tasksToCsv(tasks), 'text/csv;charset=utf-8')}>
          Exporter les tâches (.csv)
        </Button>
        <Button icon={<DownloadIcon size={14} />} onClick={() => downloadTextFile('my-agenda.ics', agendaToIcs(tasks, events.filter((e) => !e.source_id)), 'text/calendar')}>
          Exporter l'agenda (.ics)
        </Button>
        <Button icon={<DownloadIcon size={14} />} disabled={!notes.length}
          onClick={() => downloadTextFile('my-agenda-notes.txt', notes.map(noteToTxt).join('\r\n\r\n\r\n'), 'text/plain;charset=utf-8')}>
          Exporter les notes (.txt)
        </Button>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.8 }}>
        Le CSV contient toutes les tâches actives. Le .ics (sans les calendriers importés, répétitions comprises) s'ouvre dans Google Agenda, Outlook…
        Le .txt regroupe toutes tes notes, l'une après l'autre.
      </p>
    </div>
  );
}
