import { DownloadIcon } from '../../shared/icons/Icons';
import { Button } from '../../shared/ui';
import { agendaToIcs, tasksToCsv } from '../../services/exportService';
import { downloadTextFile } from '../../infrastructure/files/download';
import { useTaskStore } from '../../store/taskStore';
import { useEventStore } from '../../store/eventStore';

export function ExportSettings() {
  const tasks = useTaskStore((s) => s.tasks);
  const events = useEventStore((s) => s.events);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button icon={<DownloadIcon size={14} />} onClick={() => downloadTextFile('my-agenda-taches.csv', tasksToCsv(tasks), 'text/csv;charset=utf-8')}>
          Exporter les tâches (.csv)
        </Button>
        <Button icon={<DownloadIcon size={14} />} onClick={() => downloadTextFile('my-agenda.ics', agendaToIcs(tasks, events.filter((e) => !e.source_id)), 'text/calendar')}>
          Exporter l'agenda (.ics)
        </Button>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.8 }}>
        Le CSV contient toutes les tâches actives. Le .ics (sans les calendriers importés) s'ouvre dans Google Agenda, Outlook…
      </p>
    </div>
  );
}
