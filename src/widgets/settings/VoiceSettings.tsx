import { useEffect } from 'react';
import { CheckIcon, DownloadIcon, MicIcon } from '../../shared/icons/Icons';
import { Button } from '../../shared/ui';
import { useVoiceStore } from '../../store/voiceStore';
import { VOICE_HELP } from '../../services/voiceController';
import { VOICE_SHORTCUT_LABEL } from '../voice/VoicePanel';
import { isMac } from '../../infrastructure/platform';
import { SettingRow } from './SettingsSection';

/** Réglages → Commande vocale : modèle de reconnaissance, raccourci, exemples de phrases. */
export function VoiceSettings() {
  const { models, modelId, download, shortcutOk, phase, refreshModels, setModel, downloadModel, toggle } = useVoiceStore();
  useEffect(() => { void refreshModels(); }, [refreshModels]);
  const pct = download ? Math.round((download.downloaded / Math.max(1, download.total)) * 100) : 0;
  const ready = models.find((m) => m.id === modelId)?.downloaded;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SettingRow
        label="Parler à My Agenda"
        description={shortcutOk
          ? `Bouton micro dans la barre de gauche, ou ${VOICE_SHORTCUT_LABEL} — même quand My Agenda est caché. Dis « éteins-toi » ou appuie à nouveau pour couper. Le micro se coupe aussi seul après 30 s de silence.`
          : `Bouton micro dans la barre de gauche. Le raccourci ${VOICE_SHORTCUT_LABEL} est déjà utilisé par une autre application sur cet ordinateur.`}
      >
        <Button variant={phase !== 'off' ? 'danger' : 'primary'} icon={<MicIcon size={14} />} disabled={!ready} onClick={() => void toggle()}>
          {phase !== 'off' ? 'Couper le micro' : 'Essayer'}
        </Button>
      </SettingRow>

      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface-el)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Modèle de reconnaissance</div>
        {models.map((m) => {
          const selected = m.id === modelId;
          const busy = download?.model === m.id;
          return (
            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" name="voice-model" checked={selected} onChange={() => void setModel(m.id)} style={{ accentColor: 'var(--accent)' }} />
              <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>
                {m.label} <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>· {m.sizeMb} Mo</span>
              </span>
              {m.downloaded ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckIcon size={12} /> Téléchargé</span>
              ) : busy ? (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{pct} %</span>
              ) : (
                <Button size="sm" icon={<DownloadIcon size={12} />} disabled={!!download} onClick={(e) => { e.preventDefault(); void downloadModel(m.id); }}>Télécharger</Button>
              )}
            </label>
          );
        })}
        {download && (
          <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s' }} />
          </div>
        )}
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Téléchargé une seule fois. Tout se passe sur cet ordinateur : ta voix n'est ni enregistrée ni envoyée.
          Les commandes se disent en français ; le titre et le contenu peuvent être dictés en français, en anglais ou en espagnol.
        </p>
      </div>

      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface-el)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 6 }}>Exemples de phrases</div>
        <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 18, listStyle: 'disc' }}>
          {VOICE_HELP.map((l) => <li key={l}>{l}</li>)}
          <li>Dates : « demain à 14 h », « vendredi », « lundi prochain à 9 h et demie », « le 25 octobre », « dans 2 heures ».</li>
          <li>Répétition : « toutes les semaines », « chaque mois ». Ponctuation : « virgule », « à la ligne ».</li>
        </ul>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {isMac()
          ? 'Au premier essai, macOS demande l’autorisation d’utiliser le micro. Pour la changer : Réglages Système → Confidentialité et sécurité → Microphone.'
          : 'Si le micro ne répond pas : Paramètres Windows → Confidentialité et sécurité → Microphone → « Autoriser les applications de bureau à accéder au microphone ».'}
      </p>
    </div>
  );
}
