import { useEffect, useState } from 'react';
import { Button, Field, TextInput } from '../../shared/ui';
import { useAuthStore } from '../../store/authStore';
import { AuthLayout, FormError, FormInfo, LinkButton } from './AuthLayout';
import { CodeInput, isCodeComplete } from './CodeInput';

type Step = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

const MIN_PASSWORD = 8;
const RESEND_DELAY_S = 60;
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/**
 * Connexion / création de compte. La création envoie un code par email (vérification de l'adresse),
 * "Mot de passe oublié" fonctionne de la même façon.
 */
export function AuthScreen() {
  const store = useAuthStore();
  const [step, setStep] = useState<Step>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function go(next: Step) {
    setStep(next);
    setError(null);
    setInfo(null);
    setCode('');
    if (next === 'signin' || next === 'signup') { setPassword(''); setConfirm(''); }
  }

  async function attempt(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'email_not_confirmed') {
        // Compte créé mais jamais vérifié : on renvoie un code et on passe à la saisie.
        await store.resendCode(email).catch(() => undefined);
        go('verify');
        setInfo('Ton adresse n’est pas encore vérifiée : un nouveau code vient d’être envoyé.');
        setCooldown(RESEND_DELAY_S);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const signIn = () => attempt(async () => {
    if (!isEmail(email) || !password) throw new Error('Renseigne ton email et ton mot de passe.');
    await store.signIn(email, password);
  });

  const signUp = () => attempt(async () => {
    if (!isEmail(email)) throw new Error('Adresse email invalide.');
    if (password.length < MIN_PASSWORD) throw new Error(`Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);
    if (password !== confirm) throw new Error('Les deux mots de passe ne correspondent pas.');
    const needsCode = await store.signUp(email, password);
    if (needsCode) {
      go('verify');
      setInfo(`Un code de vérification a été envoyé à ${email.trim()}.`);
      setCooldown(RESEND_DELAY_S);
    }
  });

  const verify = () => attempt(async () => {
    if (!isCodeComplete(code)) throw new Error('Saisis le code reçu par email.');
    await store.verifySignup(email, code);
  });

  /** Modèle d'email par défaut de Supabase (lien au lieu d'un code) : une fois le lien cliqué, on se connecte. */
  const confirmedByLink = () => attempt(async () => {
    if (!password) {
      go('signin');
      setInfo('Adresse confirmée ? Connecte-toi avec ton mot de passe.');
      return;
    }
    try {
      await store.signIn(email, password);
    } catch (e) {
      if ((e as { code?: string }).code === 'email_not_confirmed') {
        throw new Error("L'adresse n'est pas encore confirmée : clique d'abord sur le lien reçu par email.");
      }
      throw e;
    }
  });

  const resend = () => attempt(async () => {
    await store.resendCode(email);
    setInfo('Nouveau code envoyé. Pense à vérifier tes spams.');
    setCooldown(RESEND_DELAY_S);
  });

  const sendReset = () => attempt(async () => {
    if (!isEmail(email)) throw new Error('Adresse email invalide.');
    await store.sendPasswordReset(email);
    go('reset');
    setInfo(`Si un compte existe pour ${email.trim()}, un code vient d’y être envoyé.`);
    setCooldown(RESEND_DELAY_S);
  });

  const reset = () => attempt(async () => {
    if (!isCodeComplete(code)) throw new Error('Saisis le code reçu par email.');
    if (password.length < MIN_PASSWORD) throw new Error(`Le mot de passe doit faire au moins ${MIN_PASSWORD} caractères.`);
    if (password !== confirm) throw new Error('Les deux mots de passe ne correspondent pas.');
    await store.resetPassword(email, code, password);
  });

  const submitOnEnter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter') fn(); };

  if (step === 'verify' || step === 'reset') {
    const isReset = step === 'reset';
    return (
      <AuthLayout
        title={isReset ? 'Nouveau mot de passe' : 'Vérifie ton adresse email'}
        subtitle={<>Un email a été envoyé à <b style={{ color: 'var(--text)' }}>{email.trim()}</b>.</>}
        footer={<LinkButton onClick={() => go(isReset ? 'forgot' : 'signup')}>← Changer d’adresse</LinkButton>}
      >
        <FormInfo message={info} />
        {!isReset && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: -6 }}>
            Tu as reçu un <b>lien</b> plutôt qu'un code ? Clique dessus (la page qui s'ouvre peut afficher une erreur, ce n'est pas grave),
            puis reviens ici :
          </p>
        )}
        {!isReset && (
          <Button onClick={confirmedByLink} disabled={busy} style={{ width: '100%' }}>J'ai cliqué sur le lien de l'email</Button>
        )}
        <CodeInput value={code} onChange={setCode} onSubmit={isReset ? reset : verify} />
        {isReset && (
          <>
            <Field label="Nouveau mot de passe"><TextInput type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <Field label="Confirmer"><TextInput type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={submitOnEnter(reset)} /></Field>
          </>
        )}
        <FormError message={error} />
        <Button variant="primary" onClick={isReset ? reset : verify} disabled={busy} style={{ width: '100%', padding: '10px' }}>
          {busy ? 'Vérification…' : isReset ? 'Changer le mot de passe' : 'Valider le code'}
        </Button>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
          Pas reçu ? Vérifie tes spams ou{' '}
          {cooldown > 0 ? <span>renvoie un code dans {cooldown} s</span> : <LinkButton onClick={isReset ? sendReset : resend}>renvoie un code</LinkButton>}
        </div>
      </AuthLayout>
    );
  }

  if (step === 'forgot') {
    return (
      <AuthLayout title="Mot de passe oublié" subtitle="Tu vas recevoir un code par email pour choisir un nouveau mot de passe."
        footer={<LinkButton onClick={() => go('signin')}>← Retour à la connexion</LinkButton>}>
        <Field label="Email"><TextInput type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={submitOnEnter(sendReset)} /></Field>
        <FormError message={error} />
        <Button variant="primary" onClick={sendReset} disabled={busy} style={{ width: '100%', padding: '10px' }}>{busy ? 'Envoi…' : 'Recevoir un code'}</Button>
      </AuthLayout>
    );
  }

  const isSignup = step === 'signup';
  return (
    <AuthLayout
      title={isSignup ? 'Créer un compte' : 'Connexion'}
      subtitle={isSignup ? 'Tes tâches et ton agenda, synchronisés sur tous tes appareils.' : 'Content de te revoir 👋'}
      footer={isSignup
        ? <>Déjà un compte ? <LinkButton onClick={() => go('signin')}>Se connecter</LinkButton></>
        : <>Pas encore de compte ? <LinkButton onClick={() => go('signup')}>Créer un compte</LinkButton></>}
    >
      <Field label="Email">
        <TextInput type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" />
      </Field>
      <Field label="Mot de passe" hint={isSignup ? `${MIN_PASSWORD} caractères minimum.` : undefined}>
        <TextInput type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password}
          onChange={(e) => setPassword(e.target.value)} onKeyDown={isSignup ? undefined : submitOnEnter(signIn)} />
      </Field>
      {isSignup && (
        <Field label="Confirmer le mot de passe">
          <TextInput type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={submitOnEnter(signUp)} />
        </Field>
      )}
      {!isSignup && (
        <div style={{ marginTop: -8, textAlign: 'right', fontSize: 'var(--text-xs)' }}>
          <LinkButton onClick={() => go('forgot')}>Mot de passe oublié ?</LinkButton>
        </div>
      )}
      <FormError message={error} />
      <Button variant="primary" onClick={isSignup ? signUp : signIn} disabled={busy} style={{ width: '100%', padding: '10px' }}>
        {busy ? 'Patiente…' : isSignup ? 'Créer mon compte' : 'Se connecter'}
      </Button>
    </AuthLayout>
  );
}
