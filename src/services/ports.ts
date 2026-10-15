/**
 * Ports = contrats que l'infrastructure doit remplir.
 * Les services ne connaissent que ces interfaces : SQLite, la mémoire (mode navigateur)
 * ou demain une autre base sont interchangeables sans toucher à la logique métier.
 */
import type { Attachment, SubTask, Task, TaskPatch } from '../domain/task/task';
import type { CalendarEvent, CalendarSource, EventPatch } from '../domain/event/event';

/**
 * Cycle de vie d'une tâche via `is_deleted` :
 * 0 = active, 1 = dans la corbeille, 2 = supprimée définitivement (pierre tombale conservée
 * pour que la suppression se propage aux autres appareils lors de la synchronisation).
 */
export interface TaskRepository {
  /** Tâches actives et dans la corbeille (pas les supprimées définitivement), sous-tâches jointes. */
  listAll(): Promise<Task[]>;
  /** Pour la synchronisation : toutes les tâches modifiées après `since`, pierres tombales comprises. */
  listChangedSince(since: string): Promise<Task[]>;
  insert(task: Task): Promise<void>;
  update(id: string, patch: TaskPatch, updatedAt: string): Promise<void>;
  setDeleted(id: string, deleted: boolean, updatedAt: string): Promise<void>;
  /** Suppression définitive (laisse une pierre tombale is_deleted = 2). */
  purge(id: string, updatedAt: string): Promise<void>;
  /** Utilisé par la synchronisation : insère ou remplace la tâche complète. */
  upsert(task: Task): Promise<void>;

  insertSubtask(subtask: SubTask): Promise<void>;
  updateSubtask(id: string, patch: Partial<Pick<SubTask, 'title' | 'is_done' | 'position'>>): Promise<void>;
  deleteSubtask(id: string): Promise<void>;

  listAttachments(taskId: string): Promise<Attachment[]>;
  insertAttachment(attachment: Attachment): Promise<void>;
  deleteAttachment(id: string): Promise<void>;
}

export interface EventRepository {
  /** Évènements visibles (non supprimés). */
  listAll(): Promise<CalendarEvent[]>;
  /** Pour la synchronisation : évènements personnels (hors .ics) modifiés après `since`, supprimés compris. */
  listChangedSince(since: string): Promise<CalendarEvent[]>;
  insert(event: CalendarEvent): Promise<void>;
  update(id: string, patch: EventPatch, updatedAt: string): Promise<void>;
  /** Suppression (pierre tombale is_deleted = 1, propagée aux autres appareils). */
  markDeleted(id: string, updatedAt: string): Promise<void>;
  upsert(event: CalendarEvent): Promise<void>;
  /** Remplace tous les évènements d'une source importée (upsert + suppression des disparus). */
  replaceSourceEvents(sourceId: string, events: CalendarEvent[]): Promise<void>;
  deleteBySource(sourceId: string): Promise<void>;
}

export interface CalendarSourceRepository {
  listAll(): Promise<CalendarSource[]>;
  insert(source: CalendarSource): Promise<void>;
  update(id: string, patch: Partial<Omit<CalendarSource, 'id' | 'created_at'>>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface HttpClient {
  getText(url: string): Promise<string>;
}

/** Évènement lu dans un calendrier externe (.ics), avant conversion en CalendarEvent. */
export interface ExternalEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  description?: string;
}

export type CalendarParser = (text: string, range: { rangeStart: Date; rangeEnd: Date }) => ExternalEvent[];

export interface AuthUser {
  id: string;
  email: string;
}

/** Comptes utilisateurs (Supabase Auth aujourd'hui). */
export interface AuthGateway {
  /** false si l'URL / la clé du serveur ne sont pas configurées (.env). */
  isConfigured(): boolean;
  /** Utilisateur de la session mémorisée — fonctionne hors ligne. */
  currentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  /** Crée le compte ; un code de vérification est envoyé par email. */
  signUp(email: string, password: string): Promise<{ needsVerification: boolean; user: AuthUser | null }>;
  verifySignupCode(email: string, code: string): Promise<AuthUser>;
  resendSignupCode(email: string): Promise<void>;
  sendPasswordResetCode(email: string): Promise<void>;
  /** Vérifie le code reçu, ouvre la session et définit le nouveau mot de passe. */
  resetPassword(email: string, code: string, newPassword: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}

/** Quelle base locale appartient à quel compte, sur cet appareil. */
export interface AccountRegistry {
  databaseFor(userId: string): string | null;
  assign(userId: string, file: string): void;
  /** Compte auquel la base historique (avant les comptes) a été rattachée, s'il y en a un. */
  legacyOwner(): string | null;
  setLegacyOwner(userId: string): void;
}

/** Accès aux fichiers de base locale. */
export interface LocalDatabases {
  readonly legacyFile: string;
  /** false en mode navigateur (données en mémoire). */
  readonly persistent: boolean;
  select(file: string): void;
  currentFile(): string | null;
  countRows(file: string): Promise<Record<string, number>>;
  /** Chemin complet du fichier (pour l'afficher à l'utilisateur). */
  pathOf(file: string): Promise<string>;
}

/** Stockage distant pour la synchronisation multi-appareils (Supabase aujourd'hui). */
export interface RemoteStore {
  /** Une session valide existe (l'utilisateur est connecté). */
  isConnected(): Promise<boolean>;
  pushTasks(tasks: Task[]): Promise<void>;
  pushEvents(events: CalendarEvent[]): Promise<void>;
  /**
   * Lignes modifiées sur le serveur après `cursor` (horodatage SERVEUR, insensible aux horloges
   * des appareils). `cursor` absent = tout récupérer. Renvoie le nouveau curseur.
   */
  pullTasks(cursor?: string): Promise<RemotePage<Task>>;
  pullEvents(cursor?: string): Promise<RemotePage<CalendarEvent>>;
}

export interface RemotePage<T> {
  rows: T[];
  /** Plus grand horodatage serveur vu (null si aucune ligne). */
  cursor: string | null;
}

/** Notification planifiée (voir domain/reminder). */
export interface ScheduledNotification {
  key: string;
  atMs: number;
  title: string;
  body: string;
}

/** Planificateur natif : déclenche les notifications à l'heure, même application en arrière-plan. */
export interface ReminderScheduler {
  /** Remplace le planning complet. */
  schedule(list: ScheduledNotification[]): Promise<void>;
  /** Appelé avec la clé de chaque rappel envoyé. */
  onFired(cb: (key: string) => void): Promise<() => void>;
}

/** Nouvelle version publiée de l'application. */
export interface AppUpdate {
  version: string;
  currentVersion: string;
  /** Notes de version (texte, éventuellement Markdown simple). */
  notes?: string;
  /** Date de publication ISO. */
  date?: string;
}

export interface UpdateProgress {
  downloaded: number;
  /** Taille totale en octets, si le serveur l'indique. */
  total?: number;
}

/** Mise à jour de l'application installée (vérification signée, téléchargement, installation). */
export interface Updater {
  /** Faux dans le navigateur et en mode développement : il n'y a rien à mettre à jour. */
  readonly supported: boolean;
  check(): Promise<AppUpdate | null>;
  /** Télécharge et installe la version trouvée par check(), puis redémarre l'application. */
  install(onProgress?: (p: UpdateProgress) => void): Promise<void>;
}

export interface Notifier {
  ensurePermission(): Promise<boolean>;
  notify(title: string, body: string): Promise<void>;
}

/** Données susceptibles d'être modifiées par une autre fenêtre (grand agenda ↔ mini). */
export type ChangeChannel = 'tasks' | 'events' | 'settings' | 'mini' | 'auth';

/** Bus de notification entre fenêtres : "j'ai modifié X, relis-le". */
export interface ChangeBus {
  publish(channel: ChangeChannel): void;
  /** Ne reçoit que les changements des AUTRES fenêtres. Renvoie la fonction de désabonnement. */
  subscribe(cb: (channel: ChangeChannel) => void): Promise<() => void>;
}

export interface Repositories {
  tasks: TaskRepository;
  events: EventRepository;
  sources: CalendarSourceRepository;
  settings: SettingsRepository;
}
