import { ChevronLeftIcon, ChevronRightIcon, LinkIcon, PlusIcon } from '../../shared/icons/Icons';
import { Button, IconButton, PageHeader, SegmentedControl } from '../../shared/ui';
import type { AgendaView } from '../../store/settingsStore';
import type { AgendaFilter, AgendaNavigation } from './useAgendaNavigation';

export function AgendaToolbar({ nav, onNewEvent, onImport }: { nav: AgendaNavigation; onNewEvent: () => void; onImport: () => void }) {
  return (
    <PageHeader
      title="Agenda"
      actions={
        <>
          <Button icon={<LinkIcon size={13} />} onClick={onImport} title="Importer un emploi du temps (.ics)">Importer</Button>
          <Button variant="primary" icon={<PlusIcon size={14} />} onClick={onNewEvent}>Évènement</Button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconButton label="Précédent" size={28} onClick={() => nav.move(-1)}><ChevronLeftIcon size={13} /></IconButton>
        <IconButton label="Suivant" size={28} onClick={() => nav.move(1)}><ChevronRightIcon size={13} /></IconButton>
        <Button size="sm" onClick={nav.goToday}>Aujourd'hui</Button>
        <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginLeft: 6, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{nav.label}</span>
      </div>
      <div style={{ flex: 1 }} />
      <SegmentedControl<AgendaView>
        size="sm"
        value={nav.view}
        onChange={nav.changeView}
        options={[{ value: 'day', label: 'Jour' }, { value: 'week', label: 'Semaine' }, { value: 'month', label: 'Mois' }]}
      />
      <SegmentedControl<AgendaFilter>
        size="sm"
        value={nav.filter}
        onChange={nav.setFilter}
        options={[{ value: 'all', label: 'Tout' }, { value: 'tasks', label: 'Tâches' }, { value: 'events', label: 'Évènements' }]}
      />
    </PageHeader>
  );
}
