import type { AccountRegistry, AuthGateway, AuthUser, LocalDatabases } from './ports';
import type { SyncService } from './syncService';

export type SessionState =
  | { kind: 'unconfigured' }
  | { kind: 'signedOut' }
  /** 1re connexion de ce compte sur ce PC alors que des données d'avant les comptes existent. */
  | { kind: 'legacyChoice'; user: AuthUser; counts: Record<string, number> }
  | { kind: 'signedIn'; user: AuthUser };

const DEMO_USER: AuthUser = { id: 'demo', email: 'demo@my-agenda.local' };

/** Nom du fichier de base d'un compte. */
export function databaseFileFor(userId: string): string {
  return `user-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}.db`;
}

/**
 * Comptes utilisateurs : connexion, inscription avec code de vérification,
 * et choix de la base locale propre à chaque compte.
 */
export function createAuthService(deps: {
  auth: AuthGateway;
  registry: AccountRegistry;
  databases: LocalDatabases;
  sync: SyncService;
}) {
  const { auth, registry, databases, sync } = deps;

  /** Ouvre la session locale d'un utilisateur authentifié (sélection de sa base). */
  async function enter(user: AuthUser): Promise<SessionState> {
    const file = registry.databaseFor(user.id);
    if (file) {
      databases.select(file);
      return { kind: 'signedIn', user };
    }
    if (databases.persistent && !registry.legacyOwner()) {
      const counts = await databases.countRows(databases.legacyFile).catch(() => ({} as Record<string, number>));
      const total = Object.entries(counts).filter(([k]) => !k.startsWith('Réglages')).reduce((n, [, v]) => n + v, 0);
      if (total > 0) return { kind: 'legacyChoice', user, counts };
    }
    const own = databaseFileFor(user.id);
    registry.assign(user.id, own);
    databases.select(own);
    return { kind: 'signedIn', user };
  }

  return {
    isConfigured: () => auth.isConfigured(),

    /** Au démarrage : session mémorisée ? (fonctionne hors ligne) */
    async restore(): Promise<SessionState> {
      if (!auth.isConfigured()) {
        // Mode navigateur sans serveur configuré : démo directe pour travailler l'interface.
        if (!databases.persistent) return enter(DEMO_USER);
        return { kind: 'unconfigured' };
      }
      const user = await auth.currentUser();
      return user ? enter(user) : { kind: 'signedOut' };
    },

    async signIn(email: string, password: string): Promise<SessionState> {
      return enter(await auth.signIn(email.trim().toLowerCase(), password));
    },

    async signUp(email: string, password: string): Promise<{ needsVerification: boolean; state?: SessionState }> {
      const res = await auth.signUp(email.trim().toLowerCase(), password);
      if (!res.needsVerification && res.user) return { needsVerification: false, state: await enter(res.user) };
      return { needsVerification: true };
    },

    async verifySignup(email: string, code: string): Promise<SessionState> {
      return enter(await auth.verifySignupCode(email.trim().toLowerCase(), code));
    },

    resendCode: (email: string) => auth.resendSignupCode(email.trim().toLowerCase()),
    sendPasswordReset: (email: string) => auth.sendPasswordResetCode(email.trim().toLowerCase()),

    async resetPassword(email: string, code: string, newPassword: string): Promise<SessionState> {
      return enter(await auth.resetPassword(email.trim().toLowerCase(), code, newPassword));
    },

    /** Rattacher (ou non) les données d'avant les comptes au compte qui se connecte. */
    async decideLegacy(user: AuthUser, attach: boolean): Promise<SessionState> {
      if (attach) {
        registry.assign(user.id, databases.legacyFile);
        registry.setLegacyOwner(user.id);
        databases.select(databases.legacyFile);
        // Tout renvoyer au serveur à la prochaine synchronisation.
        await sync.resetSyncCursor();
      } else {
        const own = databaseFileFor(user.id);
        registry.assign(user.id, own);
        databases.select(own);
      }
      return { kind: 'signedIn', user };
    },

    async signOut(): Promise<SessionState> {
      await auth.signOut();
      return { kind: 'signedOut' };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
