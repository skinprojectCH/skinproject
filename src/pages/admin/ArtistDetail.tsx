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
  '#B08D3D', '#7A8A99', '#8B5A5A', '#6B5B45', '#5B7A6B', '#7A5B77',
  '#4A6B7A', '#7A6B4A', '#6B4A5B', '#4A7A5E', '#7A4A4A', '#5B6B7A',
  '#8A7A5B', '#5B4A6B', '#7A5B4A', '#4A5B6B', '#6B7A4A', '#7A4A6B',
  '#4A6B6B', '#8A5B6B',
];

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function StatusToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11 }}>
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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [strasse, setStrasse] = useState('');
  const [plzOrt, setPlzOrt] = useState('');
  const [ahvNummer, setAhvNummer] = useState('');
  const [mwstAktiv, setMwstAktiv] = useState(true);
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
        setEmail(found.email || '');
        setPhone(found.phone || '');
        setActive(found.status === 'active');
        setStrasse(found.strasse || '');
        setPlzOrt(found.plz_ort || '');
        setAhvNummer(found.ahv_nummer || '');
        setMwstAktiv(found.mwst_aktiv ?? true);
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

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              PWA Passwort
            </div>
            <input disabled style={{ ...inputStyle, color: '#bbb', background: '#f7f7f5' }} placeholder="••••••••" />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Wird aktiv, sobald die Artist-PWA mit echtem Login existiert (dann verschlüsselt über Supabase Auth, nie im Klartext).</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              AHV-Nummer
            </div>
            <input value={ahvNummer} onChange={(e) => setAhvNummer(e.target.value)} style={inputStyle} placeholder="756.xxxx.xxxx.xx" />
          </div>

          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12 }}>MwSt.</div>
            <StatusToggle value={mwstAktiv} onChange={setMwstAktiv} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 14, marginBottom: 6 }}>
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
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Miet- &amp; Serviceanteil in %
            </div>
            <input value={revenueShare} onChange={(e) => setRevenueShare(e.target.value)} style={{ ...inputStyle, width: 120 }} inputMode="decimal" />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>z.B. 60% Artist / 40% SkinProject (nur auf Dienstleistungen)</div>
          </div>

          <div style={{ marginBottom: 20 }}>
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
            <div style={{ marginBottom: 20 }}>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Artist-PWA Link
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 12, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                  <div>app.skinproject.ch/artist/{artist!.id.slice(0, 8)}</div>
                </div>
                <div style={{ width: 64, height: 64, flexShrink: 0, border: '1px solid #ddd', borderRadius: 4, background: 'repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 0 0/8px 8px' }} />
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Artist-PWA ist noch nicht gebaut — Link ist ein Platzhalter.</div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
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
