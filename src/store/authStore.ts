import { create } from 'zustand';
import { services } from '../app/container';
import type { AuthUser } from '../services/ports';
import type { SessionState } from '../services/authService';
import { useTaskStore } from './taskStore';
import { useEventStore } from './eventStore';

type Status = 'loading' | SessionState['kind'];

interface AuthState {
  status: Status;
  user: AuthUser | null;
  /** Données d'avant les comptes trouvées sur ce PC (étape "rattacher"). */
  legacyCounts: Record<string, number> | null;
  restore(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  /** Renvoie true si un code de vérification a été envoyé par email. */
  signUp(email: string, password: string): Promise<boolean>;
  verifySignup(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  decideLegacy(attach: boolean): Promise<void>;
  signOut(): Promise<void>;
}

const auth = services.auth;

export const useAuthStore = create<AuthState>((set, get) => {
  function apply(state: SessionState) {
    set({
      status: state.kind,
      user: 'user' in state ? state.user : null,
      legacyCounts: state.kind === 'legacyChoice' ? state.counts : null,
    });
  }

  return {
    status: 'loading',
    user: null,
    legacyCounts: null,

    async restore() {
      try {
        apply(await auth.restore());
      } catch (e) {
        console.error('[Auth]', e);
        set({ status: 'signedOut', user: null });
      }
    },
    async signIn(email, password) { apply(await auth.signIn(email, password)); },
    async signUp(email, password) {
      const res = await auth.signUp(email, password);
      if (res.state) apply(res.state);
      return res.needsVerification;
    },
    async verifySignup(email, code) { apply(await auth.verifySignup(email, code)); },
    resendCode: (email) => auth.resendCode(email),
    sendPasswordReset: (email) => auth.sendPasswordReset(email),
    async resetPassword(email, code, pwd) { apply(await auth.resetPassword(email, code, pwd)); },
    async decideLegacy(attach) {
      const user = get().user;
      if (user) apply(await auth.decideLegacy(user, attach));
    },
    async signOut() {
      apply(await auth.signOut());
      // Rien du compte précédent ne doit rester en mémoire.
      useTaskStore.setState({ tasks: [], loaded: false });
      useEventStore.setState({ events: [], sources: [], titleColors: {}, loaded: false });
      services.changeBus.publish('auth');
    },
  };
});
