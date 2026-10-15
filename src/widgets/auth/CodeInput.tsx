/** Champ de saisie du code reçu par email (6 à 10 chiffres selon la configuration Supabase). */
export function CodeInput({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <input
      className="ui-input"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus
      maxLength={10}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
      placeholder="123456"
      aria-label="Code de vérification"
      style={{ fontSize: 26, letterSpacing: 10, textAlign: 'center', fontFamily: 'ui-monospace, Consolas, monospace', padding: '12px' }}
    />
  );
}

export const isCodeComplete = (code: string) => code.length >= 6;
