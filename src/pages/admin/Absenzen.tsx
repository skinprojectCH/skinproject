import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { fetchAbsences, createAbsence, fetchArtists, type Artist } from '../../lib/queries';

type AbsenceType = 'ferien' | 'krank' | 'abwesend';

const TABS: { key: AbsenceType; label: string }[] = [
  { key: 'ferien', label: 'Ferien' },
  { key: 'krank', label: 'Krank' },
  { key: 'abwesend', label: 'Abwesend' },
];

function NewAbsenceModal({ artists, onClose, onCreated }: { artists: Artist[]; onClose: () => void; onCreated: () => void }) {
  const [artistId, setArtistId] = useState(artists[0]?.id || '');
  const [type, setType] = useState<AbsenceType>('ferien');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'vormittag' | 'nachmittag'>('vormittag');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!artistId) {
      setError('Bitte Artist auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAbsence({
        artist_id: artistId,
        type,
        start_date: dateFrom,
        end_date: dateTo,
        half_day: halfDay ? (halfDayPeriod === 'vormittag' ? 'am' : 'pm') : 'none',
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Neue Absenz" onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Artist
        </div>
        <select value={artistId} onChange={(e) => setArtistId(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }}>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Art der Absenz
        </div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)} style={{ flex: 1, textAlign: 'center', padding: 8, background: type === t.key ? '#111' : 'transparent', color: type === t.key ? '#fff' : '#777', border: 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum von
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum bis
          </div>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Dauer
        </div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 8 }}>
          <button onClick={() => setHalfDay(false)} style={{ flex: 1, padding: 8, background: !halfDay ? '#111' : 'transparent', color: !halfDay ? '#fff' : '#777', border: 'none' }}>
            Ganzer Tag
          </button>
          <button onClick={() => setHalfDay(true)} style={{ flex: 1, padding: 8, background: halfDay ? '#111' : 'transparent', color: halfDay ? '#fff' : '#777', border: 'none' }}>
            Halber Tag
          </button>
        </div>
        {halfDay && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Vormittag</div>
            <div onClick={() => setHalfDayPeriod((p) => (p === 'vormittag' ? 'nachmittag' : 'vormittag'))} style={{ width: 42, height: 24, background: 'var(--color-accent)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: halfDayPeriod === 'vormittag' ? 3 : 21, boxShadow: '0 1px 2px rgba(0,0,0,0.25)', transition: 'left 0.15s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>Nachmittag</div>
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : 'Absenz speichern'}
        </button>
      </div>
    </Modal>
  );
}

export default function Absenzen() {
  const [tab, setTab] = useState<AbsenceType>('ferien');
  const [showNew, setShowNew] = useState(false);
  const [absences, setAbsences] = useState<any[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([fetchAbsences(), fetchArtists()])
      .then(([a, ar]) => {
        setAbsences(a);
        setArtists(ar);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const filtered = absences.filter((a) => a.type === tab);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Absenzen</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Neue Absenz
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, fontSize: 13 }}>
        {TABS.map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ padding: '10px 18px', borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent', fontWeight: tab === t.key ? 700 : 400, color: tab === t.key ? '#111' : '#777', cursor: 'pointer' }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
            <div>Artist</div>
            <div>Von</div>
            <div>Bis</div>
            <div>Dauer</div>
            <div />
          </div>

          {filtered.map((a) => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee' }}>
              <div>{a.artists?.name || '—'}</div>
              <div>{new Date(a.start_date).toLocaleDateString('de-CH')}</div>
              <div>{new Date(a.end_date).toLocaleDateString('de-CH')}</div>
              <div>{a.half_day === 'none' ? 'Ganzer Tag' : 'Halber Tag'}</div>
              <div />
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Keine Einträge in dieser Kategorie.</div>}
        </>
      )}

      {showNew && (
        <NewAbsenceModal
          artists={artists}
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
