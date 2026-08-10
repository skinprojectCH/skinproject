import { useEffect, useState } from 'react';
import { fetchAppSettings, saveAppSettings, type AppSettings } from '../../lib/queries';
import { useLocationContext } from '../../lib/locationContext';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: 160, resize: 'vertical', lineHeight: 1.5 };

export default function Einstellungen() {
  const { isLocationLocked } = useLocationContext();
  const isHauptadmin = !isLocationLocked;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppSettings()
      .then(setSettings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveAppSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ color: '#999', fontSize: 13 }}>Lädt…</div>;
  if (!settings) return <div style={{ color: 'var(--color-destructive)', fontSize: 13 }}>{error || 'Einstellungen konnten nicht geladen werden.'}</div>;

  const readOnly = !isHauptadmin;

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: 28, marginBottom: 6 }}>E-Mail & Pflegeanleitungen</h2>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 28 }}>
        Diese Texte werden automatisch nach der Bezahlung an der Kasse per E-Mail verschickt -- passend zur Angabe (Tattoo oder Piercing) aus der
        Einverständniserklärung des Kunden.
      </p>

      {readOnly && (
        <div style={{ background: '#fff8e6', border: '1px solid #f0d98c', borderRadius: 6, padding: '10px 14px', fontSize: 12.5, color: '#8a6d1f', marginBottom: 20 }}>
          Nur der Hauptadmin kann diese Einstellungen bearbeiten.
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Pflegeanleitung Tattoo
        </div>
        <textarea
          value={settings.careInstructionsTattoo}
          onChange={(e) => setSettings({ ...settings, careInstructionsTattoo: e.target.value })}
          style={textareaStyle}
          placeholder="z.B. Halte das frische Tattoo die ersten Stunden mit der Folie abgedeckt…"
          disabled={readOnly}
        />
      </div>

      <div style={{ marginBottom: 32 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Pflegeanleitung Piercing
        </div>
        <textarea
          value={settings.careInstructionsPiercing}
          onChange={(e) => setSettings({ ...settings, careInstructionsPiercing: e.target.value })}
          style={textareaStyle}
          placeholder="z.B. Reinige das Piercing zweimal täglich mit steriler Kochsalzlösung…"
          disabled={readOnly}
        />
      </div>

      <h3 style={{ fontSize: 18, marginBottom: 6 }}>Dankeschön-Gutschein</h3>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>
        Wird automatisch mit der Pflegeanleitungs-Mail verschickt. Gilt ausschliesslich für Produkte, nicht für Dienstleistungen.
      </p>

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="voucherEnabled"
          checked={settings.thankYouVoucherEnabled}
          onChange={(e) => setSettings({ ...settings, thankYouVoucherEnabled: e.target.checked })}
          disabled={readOnly}
          style={{ width: 16, height: 16 }}
        />
        <label htmlFor="voucherEnabled" style={{ fontSize: 13 }}>
          Dankeschön-Gutschein aktivieren
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Betrag (CHF)
          </div>
          <input
            type="number"
            min={0}
            step={5}
            value={settings.thankYouVoucherAmount}
            onChange={(e) => setSettings({ ...settings, thankYouVoucherAmount: parseFloat(e.target.value) || 0 })}
            style={inputStyle}
            disabled={readOnly || !settings.thankYouVoucherEnabled}
          />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Gültigkeit (Monate)
          </div>
          <input
            type="number"
            min={1}
            step={1}
            value={settings.thankYouVoucherValidityMonths}
            onChange={(e) => setSettings({ ...settings, thankYouVoucherValidityMonths: parseInt(e.target.value, 10) || 1 })}
            style={inputStyle}
            disabled={readOnly || !settings.thankYouVoucherEnabled}
          />
        </div>
      </div>

      {error && <div style={{ color: 'var(--color-destructive)', fontSize: 12.5, marginBottom: 14 }}>{error}</div>}

      {!readOnly && (
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saved ? '#2e7d32' : 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '11px 24px',
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saved ? 'Gespeichert ✓' : saving ? 'Speichert…' : 'Speichern'}
        </button>
      )}
    </div>
  );
}
