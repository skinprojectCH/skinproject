import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchArtists,
  createArtist,
  updateArtist,
  fetchServices,
  fetchArtistServiceIds,
  setArtistServiceIds,
  fetchLocations,
  type Artist,
  type Service,
  type Location,
} from '../../lib/queries';

const ARTIST_COLORS = [
  '#6667AB', '#C17A5D', '#7E9680', '#7C2D42', '#C7B36C', '#B79AA0',
  '#3F6B7A', '#A8542E', '#4F7942', '#8E4585', '#C9A227', '#4A5D7A',
  '#B5533C', '#5C8374', '#9B5D73', '#705C8C', '#B08D3D', '#3E6B5C',
  '#A65B6B', '#5B4A6B',
];

const ARTIST_PWA_ORIGIN = 'https://skinproject-nine.vercel.app';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function StatusToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', fontSize: 11 }}>
      <button onClick={() => onChange(true)} style={{ padding: '4px 10px', background: value ? '#111' : 'transparent', color: value ? '#fff' : '#999', border: 'none' }}>
        Aktiv
      </button>
      <button onClick={() => onChange(false)} style={{ padding: '4px 10px', background: !value ? '#111' : 'transparent', color: !value ? '#fff' : '#999', border: 'none' }}>
        Inaktiv
      </button>
    </div>
  );
}

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [kuenstlername, setKuenstlername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [ahvNummer, setAhvNummer] = useState('');
  const [mwstNummer, setMwstNummer] = useState('');
  const [mwstProzent, setMwstProzent] = useState('');
  const [revenueShare, setRevenueShare] = useState('');
  const [color, setColor] = useState(ARTIST_COLORS[0]);
  const [locationId, setLocationId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const [pinInput, setPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;

    if (isNew) {
      Promise.all([fetchServices(), fetchLocations()])
        .then(([allServices, allLocations]) => {
          setLocations(allLocations);
          setServices(allServices);
          setRevenueShare('50');
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([fetchArtists(), fetchServices(), fetchArtistServiceIds(id), fetchLocations()])
      .then(([artists, allServices, assignedIds, allLocations]) => {
        const found = artists.find((a) => a.id === id) || null;
        if (!found) {
          setError('Artist nicht gefunden.');
          return;
        }
        setArtist(found);
        setName(found.name);
        setKuenstlername(found.kuenstlername || '');
        setEmail(found.email || '');
        setPhone(found.phone || '');
        setActive(found.status === 'active');
        setStrasse(found.strasse || '');
        setPlzOrt(found.plz_ort || '');
        setAhvNummer(found.ahv_nummer || '');
        setMwstNummer(found.mwst_nummer || '');
        setMwstProzent(found.mwst_prozent != null ? String(found.mwst_prozent) : '');
        setRevenueShare(String(found.revenue_share_pct));
        setColor(found.calendar_color);
        setLocationId(found.location_id || '');
        setLocations(allLocations);
        setServices(allServices);
        setSelectedServiceIds(assignedIds);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const nameValid = name.trim().length > 0;
  const allSelected = services.length > 0 && selectedServiceIds.length === services.length;
  const mwstAktiv = mwstNummer.trim().length > 0 && mwstProzent.trim().length > 0;

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]));
  }

  function toggleAllServices() {
    setSelectedServiceIds(allSelected ? [] : services.map((s) => s.id));
  }

  async function handleSave() {
    setAttempted(true);
    if (!nameValid) return;
    if (!isNew && !artist) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const payload = {
        name: name.trim(),
        kuenstlername: kuenstlername.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        status: (active ? 'active' : 'inactive') as 'active' | 'inactive',
        location_id: locationId || null,
        strasse: strasse.trim() || null,
        plz_ort: plzOrt.trim() || null,
        ahv_nummer: ahvNummer.trim() || null,
        mwst_aktiv: mwstAktiv,
        mwst_nummer: mwstNummer.trim() || null,
        mwst_prozent: mwstProzent ? parseFloat(mwstProzent) : null,
        revenue_share_pct: parseFloat(revenueShare) || 0,
        calendar_color: color,
      };
      if (isNew) {
        const created = await createArtist(payload);
        if (selectedServiceIds.length > 0) {
          await setArtistServiceIds(created.id, selectedServiceIds);
        }
        navigate(`/admin/artists/${created.id}`, { replace: true });
        return;
      }
      await updateArtist(artist!.id, payload);
      await setArtistServiceIds(artist!.id, selectedServiceIds);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPin() {
    if (!artist || !/^\d{4,6}$/.test(pinInput)) {
      setPinError('PIN muss 4 bis 6 Ziffern haben.');
      return;
    }
    setPinSaving(true);
    setPinError(null);
    setPinSuccess(false);
    try {
      const res = await fetch('/api/create-artist-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: artist.id, pin: pinInput }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      setPinSuccess(true);
      setPinInput('');
      setArtist({ ...artist, pin_hash: 'set' } as Artist);
    } catch (e: any) {
      setPinError(e.message);
    } finally {
      setPinSaving(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;
  if (!isNew && !artist) return <div style={{ fontSize: 13, color: '#999' }}>Artist nicht gefunden.</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ width: 360, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 19 }}>{isNew ? 'Neuer Artist' : artist!.name}</h2>
            <StatusToggle value={active} onChange={setActive} />
          </div>

          <div style={{ marginBottom: 14 }}>
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

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Künstlername
            </div>
            <input value={kuenstlername} onChange={(e) => setKuenstlername(e.target.value)} style={inputStyle} placeholder="optional, wird später im Kalender angezeigt" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Standort
            </div>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inputStyle}>
              <option value="">Keiner zugewiesen</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Strasse
            </div>
            <input value={strasse} onChange={(e) => setStrasse(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              PLZ / Ort
            </div>
            <input value={plzOrt} onChange={(e) => setPlzOrt(e.target.value)} style={inputStyle} placeholder="—" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Telefon
              </div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="—" />
            </div>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                E-Mail
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="—" />
            </div>
          </div>

          {!isNew && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 14, background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>PWA-Login (PIN)</div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '2px 10px',
                    borderRadius: 10,
                    border: `1px solid ${artist?.pin_hash ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: artist?.pin_hash ? 'var(--color-accent)' : '#999',
                  }}
                >
                  {artist?.pin_hash ? 'Eingerichtet' : 'Nicht eingerichtet'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="4–6-stelliger PIN"
                  inputMode="numeric"
                />
                <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap', opacity: pinSaving ? 0.6 : 1 }} disabled={pinSaving} onClick={handleSetPin}>
                  {pinSaving ? 'Speichert…' : artist?.pin_hash ? 'PIN ändern' : 'PIN setzen'}
                </button>
              </div>
              {pinError && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>{pinError}</div>}
              {pinSuccess && <div style={{ fontSize: 11, color: '#1a7a3f', marginTop: 6 }}>✓ PIN gespeichert.</div>}
              <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>Der Artist meldet sich damit über den PWA-Link (unten) an. Der PIN wird gehasht gespeichert, nie im Klartext.</div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              AHV-Nummer
            </div>
            <input value={ahvNummer} onChange={(e) => setAhvNummer(e.target.value)} style={inputStyle} placeholder="756.xxxx.xxxx.xx" />
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 14, background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>MwSt.</div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '2px 10px',
                  borderRadius: 10,
                  border: `1px solid ${mwstAktiv ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: mwstAktiv ? 'var(--color-accent)' : '#999',
                }}
              >
                {mwstAktiv ? 'Aktiv' : 'Inaktiv'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 14 }}>
              <div>
                <div className="label-uppercase" style={{ marginBottom: 4 }}>
                  MwSt.-Nummer
                </div>
                <input value={mwstNummer} onChange={(e) => setMwstNummer(e.target.value)} style={inputStyle} placeholder="CHE-xxx.xxx.xxx" />
              </div>
              <div>
                <div className="label-uppercase" style={{ marginBottom: 4 }}>
                  MwSt. %
                </div>
                <input value={mwstProzent} onChange={(e) => setMwstProzent(e.target.value)} style={inputStyle} placeholder="8.1" inputMode="decimal" />
              </div>
            </div>
            {(mwstNummer.trim().length > 0) !== (mwstProzent.trim().length > 0) && (
              <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 6 }}>Nummer und Satz müssen beide ausgefüllt sein, damit MwSt. aktiv ist.</div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Miet- &amp; Serviceanteil in %
            </div>
            <input value={revenueShare} onChange={(e) => setRevenueShare(e.target.value)} style={{ ...inputStyle, width: 120 }} inputMode="decimal" />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>z.B. 60% Artist / 40% SkinProject (nur auf Dienstleistungen)</div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Dienstleistungen zuweisen</div>
              {services.length > 0 && (
                <button onClick={toggleAllServices} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: allSelected ? '1.5px solid #111' : '1.5px solid #ddd',
                      background: allSelected ? '#111' : 'transparent',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: 10,
                      textAlign: 'center',
                      lineHeight: '13px',
                    }}
                  >
                    {allSelected ? '✓' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>Alle markieren</div>
                </button>
              )}
            </div>
            {services.length === 0 ? (
              <div style={{ fontSize: 12, color: '#999' }}>Noch keine Dienstleistungen erfasst.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {services.map((s) => {
                  const isSelected = selectedServiceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s.id)}
                      style={{
                        border: isSelected ? '1px solid #111' : '1px solid #ddd',
                        background: isSelected ? '#111' : 'transparent',
                        color: isSelected ? '#fff' : '#999',
                        borderRadius: 12,
                        padding: '5px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {isSelected ? '☑' : '☐'} {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!isNew && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)' }}>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Artist-PWA Link
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 12, color: '#555', display: 'flex', justifyContent: 'space-between', overflow: 'hidden' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`${ARTIST_PWA_ORIGIN}/artist/${artist!.id}`}</div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ flexShrink: 0 }}
                  onClick={() => navigator.clipboard.writeText(`${ARTIST_PWA_ORIGIN}/artist/${artist!.id}`)}
                >
                  Kopieren
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {artist?.pin_hash ? 'Link öffnen und mit dem PIN oben anmelden.' : 'Erst PIN oben setzen, dann funktioniert der Login über diesen Link.'}
              </div>
            </div>
          )}

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 24, background: 'var(--color-surface)' }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Farbe auswählen für Termine im Kalender
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4, maxWidth: 340 }}>
              {ARTIST_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid #111' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>Wichtig für Statistiken und Kasse</div>
          </div>

          {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}
          {saved && <div style={{ fontSize: 12, color: '#1a7a3f', marginBottom: 12 }}>✓ Gespeichert.</div>}

          <button className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
            {saving ? (isNew ? 'Erstellt…' : 'Speichert…') : isNew ? 'Erstellen' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
