import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchArtists,
  updateArtist,
  deleteArtist,
  fetchServices,
  fetchArtistServiceIds,
  setArtistServiceIds,
  type Artist,
  type Service,
} from '../../lib/queries';

const ARTIST_COLORS = ['#B08D3D', '#7A8A99', '#8B5A5A', '#6B5B45', '#5B7A6B', '#7A5B77'];
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
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [revenueShare, setRevenueShare] = useState('');
  const [color, setColor] = useState(ARTIST_COLORS[0]);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchArtists(), fetchServices(), fetchArtistServiceIds(id)])
      .then(([artists, allServices, assignedIds]) => {
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
        setRevenueShare(String(found.revenue_share_pct));
        setColor(found.calendar_color);
        setServices(allServices);
        setSelectedServiceIds(assignedIds);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const nameValid = name.trim().length > 0;

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]));
  }

  async function handleSave() {
    setAttempted(true);
    if (!nameValid || !artist) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateArtist(artist.id, {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status: active ? 'active' : 'inactive',
        revenue_share_pct: parseFloat(revenueShare) || 0,
        calendar_color: color,
      });
      await setArtistServiceIds(artist.id, selectedServiceIds);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!artist) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteArtist(artist.id);
      navigate('/admin/artists');
    } catch (e: any) {
      setSaveError(
        e.message?.includes('foreign key')
          ? 'Dieser Artist hat bereits Termine/Bestellungen und kann nicht gelöscht werden — stattdessen auf "Inaktiv" setzen.'
          : e.message
      );
      setDeleting(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;
  if (!artist) return <div style={{ fontSize: 13, color: '#999' }}>Artist nicht gefunden.</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ width: 360, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 19 }}>{artist.name}</h2>
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

          <div style={{ fontSize: 11, color: '#999', marginTop: 20 }}>
            Adresse, AHV- und MWST-Angaben pro Artist folgen in einer späteren Ausbaustufe.
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Umsatzbeteiligung in %
            </div>
            <input value={revenueShare} onChange={(e) => setRevenueShare(e.target.value)} style={{ ...inputStyle, width: 120 }} inputMode="decimal" />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>z.B. 60% Artist / 40% SkinProject (nur auf Dienstleistungen)</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Dienstleistungen zuweisen</div>
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

          <div style={{ marginBottom: 20 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Artist-PWA Link
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 12, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                <div>app.skinproject.ch/artist/{artist.id.slice(0, 8)}</div>
              </div>
              <div style={{ width: 64, height: 64, flexShrink: 0, border: '1px solid #ddd', borderRadius: 4, background: 'repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 0 0/8px 8px' }} />
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Artist-PWA ist noch nicht gebaut — Link ist ein Platzhalter.</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="label-uppercase" style={{ marginBottom: 4 }}>
              Farbe auswählen für Termine im Kalender
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              {ARTIST_COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: color === c ? '2px solid #111' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>Wichtig für Statistiken und Kasse</div>
          </div>

          {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}
          {saved && <div style={{ fontSize: 12, color: '#1a7a3f', marginBottom: 12 }}>✓ Gespeichert.</div>}

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </div>

          {!confirmDelete ? (
            <button className="btn btn-destructive" onClick={() => setConfirmDelete(true)}>
              Artist löschen
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                Doch nicht
              </button>
              <button
                className="btn btn-destructive"
                style={{ background: 'var(--color-destructive)', color: '#fff', opacity: deleting ? 0.6 : 1 }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Löscht…' : 'Wirklich löschen'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
