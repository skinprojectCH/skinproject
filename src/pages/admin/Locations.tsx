import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { useLocationContext } from '../../lib/locationContext';
import {
  fetchLocations,
  createLocation,
  updateLocation,
  fetchLocationManagers,
  createLocationManager,
  updateLocationManager,
  deleteLocationManager,
  setMainLocation,
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
  role: 'manager' | 'employee';
  pinConfigured: boolean;
  deleted: boolean;
}

interface PinState {
  pin: string;
  creating: boolean;
  error: string | null;
  success: boolean;
}

// Admin-Accounts sind nicht an einen Standort gebunden, daher separat von den
// Standort-Teams verwaltet. Nur für Admins sichtbar (siehe Aufrufstelle unten).
function AdminAccountsSection() {
  const [admins, setAdmins] = useState<{ id: string; vorname: string; name: string; pinConfigured: boolean }[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newVorname, setNewVorname] = useState('');
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pinEdits, setPinEdits] = useState<Record<string, string>>({});
  const [pinSaving, setPinSaving] = useState<Record<string, boolean>>({});
  const [pinErrors, setPinErrors] = useState<Record<string, string>>({});

  function load() {
    fetch('/api/staff-list')
      .then((r) => r.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setAdmins((body.staff || []).filter((s: any) => s.role === 'admin'));
      })
      .catch((e) => setLoadError(e.message));
  }

  useEffect(() => load(), []);

  async function handleAdd() {
    if (!newVorname.trim() || !newName.trim() || !/^\d{4,6}$/.test(newPin)) {
      setAddError('Vorname, Name und ein 4-6-stelliger PIN sind erforderlich.');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      const res = await fetch('/api/create-staff-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', vorname: newVorname.trim(), name: newName.trim(), pin: newPin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setNewVorname('');
      setNewName('');
      setNewPin('');
      setShowAdd(false);
      load();
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePin(id: string) {
    const pin = pinEdits[id] || '';
    if (!/^\d{4,6}$/.test(pin)) {
      setPinErrors((prev) => ({ ...prev, [id]: 'PIN muss 4 bis 6 Ziffern haben.' }));
      return;
    }
    setPinSaving((prev) => ({ ...prev, [id]: true }));
    setPinErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch('/api/create-staff-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', staffId: id, pin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setPinEdits((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (e: any) {
      setPinErrors((prev) => ({ ...prev, [id]: e.message }));
    } finally {
      setPinSaving((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 16, marginBottom: 24, background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Admin-Zugänge (alle Standorte)</div>
        <div onClick={() => setShowAdd((v) => !v)} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
          {showAdd ? 'Abbrechen' : '+ Admin hinzufügen'}
        </div>
      </div>

      {loadError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 10 }}>{loadError}</div>}

      {showAdd && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginBottom: 14, alignItems: 'start' }}>
          <input value={newVorname} onChange={(e) => setNewVorname(e.target.value)} placeholder="Vorname" style={inputStyle} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" style={inputStyle} />
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="4-6-stelliger PIN"
            inputMode="numeric"
            maxLength={6}
            style={inputStyle}
          />
          <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleAdd}>
            {saving ? 'Speichert…' : 'Anlegen'}
          </button>
        </div>
      )}
      {addError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 10 }}>{addError}</div>}

      {admins?.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            {a.vorname} {a.name} {a.pinConfigured && <span style={{ color: '#1a7a3f', fontSize: 11 }}>· PIN eingerichtet</span>}
          </div>
          <input
            value={pinEdits[a.id] || ''}
            onChange={(e) => setPinEdits((prev) => ({ ...prev, [a.id]: e.target.value.replace(/\D/g, '') }))}
            placeholder="Neuer PIN"
            inputMode="numeric"
            maxLength={6}
            style={{ ...inputStyle, width: 130 }}
          />
          <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} disabled={pinSaving[a.id]} onClick={() => handleChangePin(a.id)}>
            {pinSaving[a.id] ? 'Speichert…' : 'PIN setzen'}
          </button>
          {pinErrors[a.id] && <div style={{ fontSize: 11, color: 'var(--color-destructive)' }}>{pinErrors[a.id]}</div>}
        </div>
      ))}
      {admins?.length === 0 && <div style={{ fontSize: 12, color: '#999' }}>Noch keine weiteren Admin-Accounts.</div>}
    </div>
  );
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
  const { isAdmin } = useLocationContext();
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
  const [pinStates, setPinStates] = useState<Record<string, PinState>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [settingMain, setSettingMain] = useState(false);

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
      .then((data) => setManagers(data.map((m) => ({ key: m.id, id: m.id, vorname: m.vorname, name: m.name, email: m.email || '', telefon: m.telefon || '', role: m.role, pinConfigured: !!m.pinConfigured, deleted: false }))))
      .catch((e) => setSaveError(e.message));
  }, [selectedId, locations]);

  function addManager() {
    setManagers((prev) => [...prev, { key: `new-${crypto.randomUUID()}`, id: null, vorname: '', name: '', email: '', telefon: '', role: 'manager', pinConfigured: false, deleted: false }]);
  }

  function updateManagerField(key: string, field: keyof ManagerDraft, value: string) {
    setManagers((prev) => prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)));
  }

  function removeManager(key: string) {
    setManagers((prev) => prev.map((m) => (m.key === key ? { ...m, deleted: true } : m)).filter((m) => !(m.id === null && m.key === key)));
  }

  function setPinState(key: string, patch: Partial<PinState>) {
    setPinStates((prev) => {
      const current: PinState = prev[key] || { pin: '', creating: false, error: null, success: false };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  async function handleSetPin(manager: ManagerDraft) {
    const state = pinStates[manager.key] || { pin: '', creating: false, error: null, success: false };
    if (!manager.id) {
      setPinState(manager.key, { error: 'Bitte zuerst speichern, bevor du einen PIN vergibst.' });
      return;
    }
    if (!/^\d{4,6}$/.test(state.pin)) {
      setPinState(manager.key, { error: 'PIN muss 4 bis 6 Ziffern haben.' });
      return;
    }
    setPinState(manager.key, { creating: true, error: null });
    try {
      const res = await fetch('/api/create-staff-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: manager.role, staffId: manager.id, pin: state.pin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setPinState(manager.key, { creating: false, success: true, pin: '' });
      setManagers((prev) => prev.map((m) => (m.key === manager.key ? { ...m, pinConfigured: true } : m)));
    } catch (e: any) {
      setPinState(manager.key, { creating: false, error: e.message });
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
          await updateLocationManager(m.id, { vorname: m.vorname.trim(), name: m.name.trim(), email: m.email.trim() || null, telefon: m.telefon.trim() || null, role: m.role });
        } else if (!m.deleted && !m.id && (m.vorname.trim() || m.name.trim())) {
          await createLocationManager({ location_id: selectedId, vorname: m.vorname.trim(), name: m.name.trim(), email: m.email.trim() || null, telefon: m.telefon.trim() || null, role: m.role });
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
    <div>
      {isAdmin && <AdminAccountsSection />}
      <div style={{ display: 'flex', gap: 28 }}>
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Locations</div>
          {isAdmin && (
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => setShowNew(true)}>
              + Neu
            </button>
          )}
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
            <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {l.name}
              {l.is_main && (
                <span style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: 10, padding: '1px 8px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                  Haupt
                </span>
              )}
            </div>
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

          {(() => {
            const currentLocation = locations.find((l) => l.id === selectedId);
            return (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 14, background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Haupt-Location</div>
                  <div style={{ fontSize: 11, color: '#999' }}>Hier werden Umsätze ohne eigene Location-Zuordnung gutgeschrieben (z.B. online verkaufte Gutscheine).</div>
                </div>
                {currentLocation?.is_main ? (
                  <span style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: 10, padding: '4px 12px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ✓ Aktuelle Haupt-Location
                  </span>
                ) : (
                  <button
                    className="btn btn-outline"
                    style={{ whiteSpace: 'nowrap', opacity: settingMain ? 0.6 : 1 }}
                    disabled={settingMain}
                    onClick={async () => {
                      setSettingMain(true);
                      try {
                        await setMainLocation(selectedId);
                        await reload(selectedId);
                      } catch (e: any) {
                        setSaveError(e.message);
                      } finally {
                        setSettingMain(false);
                      }
                    }}
                  >
                    Als Haupt-Location festlegen
                  </button>
                )}
              </div>
            );
          })()}

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
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 110px 130px', gap: 14 }}>
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
              <div>
                <div className="label-uppercase" style={{ marginBottom: 4, whiteSpace: 'nowrap' }}>
                  Saldosteuersatz %
                </div>
                <input value={saldosteuersatz} onChange={(e) => setSaldosteuersatz(e.target.value)} style={inputStyle} inputMode="decimal" placeholder="5.3" />
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Saldosteuersatz: für die MWST-Berechnung in der Abrechnung (vereinfachte Abrechnungsmethode, auf Salon-Umsatz ohne Artisten-Anteil).</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Team</div>
            <div onClick={addManager} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
              + Teammitglied hinzufügen
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

                <div style={{ marginBottom: 6 }}>
                  <div className="label-uppercase" style={{ marginBottom: 4 }}>
                    Rolle
                  </div>
                  <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', width: 'fit-content' }}>
                    <button
                      type="button"
                      onClick={() => setManagers((prev) => prev.map((mm) => (mm.key === m.key ? { ...mm, role: 'manager' } : mm)))}
                      style={{ padding: '7px 14px', fontSize: 12, background: m.role === 'manager' ? '#111' : 'transparent', color: m.role === 'manager' ? '#fff' : '#777', border: 'none', cursor: 'pointer' }}
                    >
                      Salon Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setManagers((prev) => prev.map((mm) => (mm.key === m.key ? { ...mm, role: 'employee' } : mm)))}
                      style={{ padding: '7px 14px', fontSize: 12, background: m.role === 'employee' ? '#111' : 'transparent', color: m.role === 'employee' ? '#fff' : '#777', border: 'none', cursor: 'pointer' }}
                    >
                      Angestellte/r
                    </button>
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
                    PIN-Login {m.pinConfigured && <span style={{ color: '#1a7a3f', textTransform: 'none' }}>· eingerichtet</span>}
                  </div>
                  {!m.id ? (
                    <div style={{ fontSize: 11, color: '#999' }}>Zuerst speichern, dann kannst du einen PIN vergeben.</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={pinStates[m.key]?.pin || ''}
                        onChange={(e) => setPinState(m.key, { pin: e.target.value.replace(/\D/g, ''), success: false })}
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="4-6-stelliger PIN vergeben"
                      />
                      <button
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', opacity: pinStates[m.key]?.creating ? 0.6 : 1 }}
                        disabled={pinStates[m.key]?.creating}
                        onClick={() => handleSetPin(m)}
                      >
                        {pinStates[m.key]?.creating ? 'Speichert…' : m.pinConfigured ? 'PIN ändern' : 'PIN vergeben'}
                      </button>
                    </div>
                  )}
                  {pinStates[m.key]?.success && <div style={{ fontSize: 11, color: '#1a7a3f', marginTop: 6 }}>✓ PIN ist eingerichtet.</div>}
                  {pinStates[m.key]?.error && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{pinStates[m.key]?.error}</div>}
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
    </div>
  );
}
