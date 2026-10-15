import { Modal, SectionTitle } from '../../shared/ui';
import { CalendarSourceList } from './CalendarSourceList';
import { ImportCalendarForm, ImportHelp } from './ImportCalendarForm';

export function ImportCalendarModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Importer un emploi du temps" onClose={onClose} width={560}>
      <ImportCalendarForm autoFocus />
      <ImportHelp />
      <div style={{ height: 1, background: 'var(--border)' }} />
      <section>
        <SectionTitle>Calendriers importés</SectionTitle>
        <CalendarSourceList />
      </section>
    </Modal>
  );
}
