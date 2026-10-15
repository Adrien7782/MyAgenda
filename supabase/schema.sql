-- ════════════════════════════════════════════════════════════════════════════
-- My Agenda — schéma Supabase (à exécuter une fois dans Supabase → SQL Editor)
-- Chaque ligne appartient à un utilisateur (user_id) ; les règles RLS empêchent
-- techniquement un compte de lire ou modifier les données d'un autre compte.
-- Le script peut être relancé sans risque (idempotent).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tâches ───────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null default '',
  comment       text,
  deadline      text,                       -- ISO 8601 (identique au format local)
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'waiting', 'done')),
  priority      text check (priority in ('high', 'medium', 'low')),
  tags          text,                       -- tableau JSON sérialisé
  recurrence    text default 'none',
  event_id      text,
  subtasks_json text,                       -- sous-tâches sérialisées
  is_deleted    smallint not null default 0, -- 0 active · 1 corbeille · 2 supprimée (pierre tombale)
  created_at    text not null,
  updated_at    text not null,              -- horloge de l'appareil (résolution des conflits)
  synced_at     timestamptz not null default now()  -- horloge du serveur (curseur de synchronisation)
);

-- ── Évènements personnels (les emplois du temps .ics restent locaux) ─────────
create table if not exists public.events (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null,
  start_at      text not null,
  duration_min  integer not null,
  comment       text,
  participants  text,
  location      text,
  is_annual     smallint not null default 0,
  is_deleted    smallint not null default 0,
  created_at    text not null,
  updated_at    text not null,
  synced_at     timestamptz not null default now()
);

-- Mise à niveau d'une ancienne table (si elle existait déjà)
alter table public.tasks  add column if not exists event_id  text;
alter table public.tasks  add column if not exists synced_at timestamptz not null default now();
alter table public.events add column if not exists location   text;
alter table public.events add column if not exists is_deleted smallint not null default 0;
alter table public.events add column if not exists synced_at  timestamptz not null default now();

-- v0.5 : rappels personnalisés
alter table public.tasks  add column if not exists reminder_offset_min integer;
alter table public.tasks  add column if not exists reminder_at         text;
alter table public.events add column if not exists reminder_offset_min integer;
alter table public.events add column if not exists reminder_at         text;

create index if not exists tasks_user_synced_idx  on public.tasks  (user_id, synced_at);
create index if not exists events_user_synced_idx on public.events (user_id, synced_at);

-- ── Horodatage serveur + propriétaire forcé à chaque écriture ────────────────
create or replace function public.my_agenda_before_write()
returns trigger language plpgsql security invoker as $$
begin
  new.synced_at := now();
  new.user_id   := auth.uid();   -- impossible d'écrire au nom d'un autre compte
  return new;
end $$;

drop trigger if exists tasks_before_write on public.tasks;
create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.my_agenda_before_write();

drop trigger if exists events_before_write on public.events;
create trigger events_before_write before insert or update on public.events
  for each row execute function public.my_agenda_before_write();

-- ── Sécurité : chacun ne voit que ses lignes ─────────────────────────────────
alter table public.tasks  enable row level security;
alter table public.events enable row level security;

drop policy if exists "tasks: propriétaire" on public.tasks;
create policy "tasks: propriétaire" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "events: propriétaire" on public.events;
create policy "events: propriétaire" on public.events
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Prise en compte immédiate des nouvelles colonnes par l’API (sinon : "column ... in the schema cache").
notify pgrst, 'reload schema';
