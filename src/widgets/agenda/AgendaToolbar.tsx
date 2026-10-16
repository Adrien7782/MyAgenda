import { ChevronLeftIcon, ChevronRightIcon, LinkIcon, PlusIcon } from '../../shared/icons/Icons';
import { Button, IconButton, PageHeader, SegmentedControl } from '../../shared/ui';
import { usePhoneLayout } from '../../shared/hooks/usePhoneLayout';
import type { AgendaView } from '../../store/settingsStore';
import type { AgendaFilter, AgendaNavigation } from './useAgendaNavigation';

const FILTERS: { value: AgendaFilter; label: string }[] = [{ value: 'all', label: 'Tout' }, { value: 'tasks', label: 'Tâches' }, { value: 'events', label: 'Évènements' }];

export function AgendaToolbar({ nav, onNewEvent, onImport }: { nav: AgendaNavigation; onNewEvent: () => void; onImport: () => void }) {
  const phone = usePhoneLayout();

  if (phone) {
    // Téléphone : Mois / Semaine / Jour, on passe d'une période à l'autre en glissant. Nouvel évènement : bouton « + » flottant.
    return (
      <>
        <PageHeader
          title={<span style={{ textTransform: 'capitalize' }}>{nav.label}</span>}
          actions={
            <>
              <IconButton label="Précédent" size={34} onClick={() => nav.move(-1)}><ChevronLeftIcon size={16} /></IconButton>
              <IconButton label="Suivant" size={34} onClick={() => nav.move(1)}><ChevronRightIcon size={16} /></IconButton>
              <Button size="sm" onClick={nav.goToday}>Auj.</Button>
            </>
          }
        >
          <SegmentedControl<AgendaView>
            size="sm"
            value={nav.view}
            onChange={nav.changeView}
            options={[{ value: 'month', label: 'Mois' }, { value: 'week', label: 'Semaine' }, { value: 'day', label: 'Jour' }]}
          />
          <SegmentedControl<AgendaFilter> size="sm" value={nav.filter} onChange={nav.setFilter} options={FILTERS} />
          <IconButton label="Importer un emploi du temps (.ics)" size={30} onClick={onImport}><LinkIcon size={14} /></IconButton>
        </PageHeader>
        <button type="button" className="fab" aria-label="Nouvel évènement" onClick={onNewEvent}>
          <PlusIcon size={24} />
        </button>
      </>
    );
  }

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
      <SegmentedControl<AgendaFilter> size="sm" value={nav.filter} onChange={nav.setFilter} options={FILTERS} />
    </PageHeader>
  );
}
