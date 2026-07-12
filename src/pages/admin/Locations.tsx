import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import {
  fetchLocations,
  createLocation,
  updateLocation,
  fetchLocationManagers,
  createLocationManager,
  updateLocationManager,
  deleteLocationManager,
  type Location,
} from '../../lib/queries';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

interface ManagerDraft {
  key: string; // stabiler React-Key: echte id ODER "new-<random>"
  id: string | null; // null = noch nicht gespeichert
  vorname: string;
  name: string;
  email: string;
  telefon: string;
  deleted: boolean;
}

interface LoginState {
  password: string;
  creating: boolean;
  error: string | null;
  success: boolean;
}

function NewLocationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [mwstProzent, setMwstProzent] = useState('8.1');
  const [saldosteuersatz, setSaldosteuersatz] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const nameValid = name.trim().length > 0;

  async function handleCreate() {
    setAttempted(true);
    if (!nameValid) return;
    setSaving(true);
    setError(null);
    try {
      await createLocation({
        name: name.trim(),
        strasse: strasse.trim() || null,
        plz_ort: plzOrt.trim() || null,
        telefon: telefon.trim() || null,
        email: email.trim() || null,
        vat_number: vatNumber.trim() || null,
        mwst_prozent: mwstProzent ? parseFloat(mwstProzent) : null,
        saldosteuersatz: saldosteuersatz ? parseFloat(saldosteuersatz) : null,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Neue Location" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Name
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={attempted && !nameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}
          placeholder="z.B. SkinProject Basel"
          autoFocus
        />
        {attempted && !nameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Bitte einen Namen eingeben.</div>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Strasse
        </div>
        <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            PLZ / Ort
          </div>
          <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Telefon
          </div>
          <input value={telefon} onChange={(e) => setTelefon(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          E-Mail
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            MWST-Nummer
          </div>
          <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} style={inputStyle} placeholder="CHE-xxx.xxx.xxx" />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            MWST %
          </div>
          <input value={mwstProzent} onChange={(e) => setMwstProzent(e.target.value)} style={inputStyle} inputMode="decimal" />
        </div>
      </div>
      <div style={{ marginBottom: 22 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Saldosteuersatz %
        </div>
        <input value={saldosteuersatz} onChange={(e) => setSaldosteuersatz(e.target.value)} style={inputStyle} inputMode="decimal" placeholder="z.B. 5.3" />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Für die MWST-Berechnung in der Abrechnung (vereinfachte Abrechnungsmethode).</div>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleCreate}>
          {saving ? 'Speichert…' : 'Erstellen'}
        </button>
      </div>
    </Modal>
  );
}

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState('');
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [mwstProzent, setMwstProzent] = useState('');
  const [saldosteuersatz, setSaldosteuersatz] = useState('');
  const [managers, setManagers] = useState<ManagerDraft[]>([]);
  const [loginStates, setLoginStates] = useState<Record<string, LoginState>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);

  function reload(selectAfterId?: string) {
    setLoading(true);
    fetchLocations()
      .then((data) => {
        setLocations(data);
        const id = selectAfterId || data[0]?.id || null;
        setSelectedId(id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => reload(), []);

  useEffect(() => {
    const selected = locations.find((l) => l.id === selectedId);
    if (!selected) return;
    setName(selected.name);
    setStrasse(selected.strasse || '');
    setPlzOrt(selected.plz_ort || '');
    setTelefon(selected.telefon || '');
    setEmail(selected.email || '');
    setVatNumber(selected.vat_number || '');
    setMwstProzent(selected.mwst_prozent != null ? String(selected.mwst_prozent) : '');
    setSaldosteuersatz(selected.saldosteuersatz != null ? String(selected.saldosteuersatz) : '');
    setSaveError(null);
    setSaved(false);
    setAttempted(false);
    fetchLocationManagers(selected.id)
      .then((data) => setManagers(data.map((m) => ({ key: m.id, id: m.id, vorname: m.vorname, name: m.name, email: m.email || '', telefon: m.telefon || '', deleted: false }))))
      .catch((e) => setSaveError(e.message));
  }, [selectedId, locations]);

  function addManager() {
    setManagers((prev) => [...prev, { key: `new-${crypto.randomUUID()}`, id: null, vorname: '', name: '', email: '', telefon: '', deleted: false }]);
  }

  function updateManagerField(key: string, field: keyof ManagerDraft, value: string) {
    setManagers((prev) => prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)));
  }

  function removeManager(key: string) {
    setManagers((prev) => prev.map((m) => (m.key === key ? { ...m, deleted: true } : m)).filter((m) => !(m.id === null && m.key === key)));
  }

  function setLoginState(key: string, patch: Partial<LoginState>) {
    setLoginStates((prev) => {
      const current: LoginState = prev[key] || { password: '', creating: false, error: null, success: false };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  async function handleCreateLogin(manager: ManagerDraft) {
    const state = loginStates[manager.key] || { password: '', creating: false, error: null, success: false };
    if (!manager.email.trim()) {
      setLoginState(manager.key, { error: 'Bitte zuerst eine E-Mail-Adresse beim Manager eintragen.' });
      return;
    }
    if (state.password.length < 8) {
      setLoginState(manager.key, { error: 'Passwort muss mindestens 8 Zeichen haben.' });
      return;
    }
    setLoginState(manager.key, { creating: true, error: null });
    try {
      const res = await fetch('/api/create-manager-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manager.email.trim(), password: state.password, location_id: selectedId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setLoginState(manager.key, { creating: false, success: true, password: '' });
    } catch (e: any) {
      setLoginState(manager.key, { creating: false, error: e.message });
    }
  }

  const nameValid = name.trim().length > 0;
  const mwstProzentMissing = vatNumber.trim().length > 0 && mwstProzent.trim().length === 0;
  const canSave = nameValid && !mwstProzentMissing;

  async function handleSave() {
    setAttempted(true);
    if (!canSave || !selectedId) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateLocation(selectedId, {
        name: name.trim(),
        strasse: strasse.trim() || null,
        plz_ort: plzOrt.trim() || null,
        telefon: telefon.trim() || null,
        email: email.trim() || null,
        vat_number: vatNumber.trim() || null,
        mwst_prozent: mwstProzent ? parseFloat(mwstProzent) : null,
        saldosteuersatz: saldosteuersatz ? parseFloat(saldosteuersatz) : null,
      });

      for (const m of managers) {
        if (m.deleted && m.id) {
          await deleteLocationManager(m.id);
        } else if (!m.deleted && m.id) {
          await updateLocationManager(m.id, { vorname: m.vorname.trim(), name: m.name.trim(), email: m.email.trim() || null, telefon: m.telefon.trim() || null });
        } else if (!m.deleted && !m.id && (m.vorname.trim() || m.name.trim())) {
          await createLocationManager({ location_id: selectedId, vorname: m.vorname.trim(), name: m.name.trim(), email: m.email.trim() || null, telefon: m.telefon.trim() || null });
        }
      }

      reload(selectedId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;

  return (
    <div style={{ display: 'flex', gap: 28 }}>
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Locations</div>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => setShowNew(true)}>
            + Neu
          </button>
        </div>
        {locations.map((l) => (
          <div
            key={l.id}
            onClick={() => setSelectedId(l.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedId(l.id)}
            style={{ border: l.id === selectedId ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)', borderRadius: 6, padding: 12, marginBottom: 8, cursor: 'pointer', background: 'var(--color-surface)' }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{l.name}</div>
            <div style={{ fontSize: 12, color: '#777' }}>
              {[l.strasse, l.plz_ort].filter(Boolean).join(', ') || l.address || '—'}
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div style={{ fontSize: 12, color: '#999' }}>
            Noch keine Locations. <span onClick={() => setShowNew(true)} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>Jetzt anlegen</span>.
          </div>
        )}
      </div>

      {selectedId && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 19, marginBottom: 16 }}>{name || '—'}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Name
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={attempted && !nameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}
              />
              {attempted && !nameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Bitte einen Namen eingeben.</div>}
            </div>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Telefon
              </div>
              <input value={telefon} onChange={(e) => setTelefon(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Strasse
            </div>
            <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                PLZ / Ort
              </div>
              <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                E-Mail
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 24, background: 'var(--color-surface)' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Registrierungslink
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, color: '#555', overflow: 'hidden' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`${window.location.origin}/register/${selectedId}`}</div>
              </div>
              <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register/${selectedId}`)}>
                Kopieren
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Für neue Kunden — z.B. als QR-Code an der Rezeption. Legt bei Absenden automatisch einen neuen Kunden an.</div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 24, background: 'var(--color-surface)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>MWST</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14 }}>
              <div>
                <div className="label-uppercase" style={{ marginBottom: 4, whiteSpace: 'nowrap' }}>
                  MWST-Nummer
                </div>
                <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} style={inputStyle} placeholder="CHE-xxx.xxx.xxx" />
              </div>
              <div>
                <div className="label-uppercase" style={{ marginBottom: 4, whiteSpace: 'nowrap' }}>
                  MWST-Satz %
                </div>
                <input
                  value={mwstProzent}
                  onChange={(e) => setMwstProzent(e.target.value)}
                  style={attempted && mwstProzentMissing ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}
                  inputMode="decimal"
                  placeholder="8.1"
                />
                {attempted && mwstProzentMissing && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Satz fehlt, wenn eine MWST-Nummer eingetragen ist.</div>}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="label-uppercase" style={{ marginBottom: 4, whiteSpace: 'nowrap' }}>
                Saldosteuersatz %
              </div>
              <input value={saldosteuersatz} onChange={(e) => setSaldosteuersatz(e.target.value)} style={{ ...inputStyle, maxWidth: 140 }} inputMode="decimal" placeholder="z.B. 5.3" />
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Für die MWST-Berechnung in der Abrechnung (vereinfachte Abrechnungsmethode, auf Salon-Umsatz ohne Artisten-Anteil).</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Location-Manager</div>
            <div onClick={addManager} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
              + Manager hinzufügen
            </div>
          </div>

          {managers
            .filter((m) => !m.deleted)
            .map((m) => (
              <div key={m.key} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '16px', marginBottom: 12, background: 'var(--color-surface)', position: 'relative' }}>
                <button
                  onClick={() => removeManager(m.key)}
                  title="Manager entfernen"
                  style={{ position: 'absolute', top: 16, right: 16, color: '#999', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
                  <div>
                    <div className="label-uppercase" style={{ marginBottom: 4 }}>
                      Name
                    </div>
                    <input value={m.name} onChange={(e) => updateManagerField(m.key, 'name', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <div className="label-uppercase" style={{ marginBottom: 4 }}>
                      Vorname
                    </div>
                    <input value={m.vorname} onChange={(e) => updateManagerField(m.key, 'vorname', e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div>
                    <div className="label-uppercase" style={{ marginBottom: 4 }}>
                      E-Mail
                    </div>
                    <input value={m.email} onChange={(e) => updateManagerField(m.key, 'email', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <div className="label-uppercase" style={{ marginBottom: 4 }}>
                      Telefon
                    </div>
                    <input value={m.telefon} onChange={(e) => updateManagerField(m.key, 'telefon', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 14, paddingTop: 14 }}>
                  <div className="label-uppercase" style={{ marginBottom: 6 }}>
                    Login-Zugang (lädt automatisch den Kalender dieser Location)
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input
                      type="password"
                      value={loginStates[m.key]?.password || ''}
                      onChange={(e) => setLoginState(m.key, { password: e.target.value, success: false })}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Neues Passwort vergeben (min. 8 Zeichen)"
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ whiteSpace: 'nowrap', opacity: loginStates[m.key]?.creating ? 0.6 : 1 }}
                      disabled={loginStates[m.key]?.creating}
                      onClick={() => handleCreateLogin(m)}
                    >
                      {loginStates[m.key]?.creating ? 'Speichert…' : 'Login erstellen / Passwort setzen'}
                    </button>
                  </div>
                  {loginStates[m.key]?.success && <div style={{ fontSize: 11, color: '#1a7a3f', marginTop: 6 }}>✓ Login-Zugang für {m.email} ist eingerichtet.</div>}
                  {loginStates[m.key]?.error && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{loginStates[m.key]?.error}</div>}
                </div>
              </div>
            ))}
          {managers.filter((m) => !m.deleted).length === 0 && <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>Noch keine Manager erfasst.</div>}

          {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', margin: '12px 0' }}>{saveError}</div>}
          {saved && <div style={{ fontSize: 12, color: '#1a7a3f', margin: '12px 0' }}>✓ Gespeichert.</div>}

          <button className="btn btn-primary" style={{ width: 160, justifyContent: 'center', marginTop: 10, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      )}

      {showNew && (
        <NewLocationModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
