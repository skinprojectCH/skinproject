import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchArtists, type Artist } from '../../lib/queries';

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function Artists() {
  const [filter, setFilter] = useState<'alle' | 'active' | 'inactive'>('alle');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchArtists()
      .then(setArtists)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = artists.filter((a) => filter === 'alle' || a.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Admin · Artists</h1>
        <button className="btn btn-primary">+ Neu</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['alle', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '8px 14px', background: filter === f ? '#111' : 'transparent', color: filter === f ? '#fff' : '#555', border: 'none' }}
            >
              {f === 'alle' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Inaktiv'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 90px 90px 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
            <div />
            <div>Name</div>
            <div>Farbe</div>
            <div>Status</div>
            <div />
          </div>

          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(`/admin/artists/${a.id}`)}
              style={{ display: 'grid', gridTemplateColumns: '24px 1fr 90px 90px 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: a.calendar_color }} />
              <div>{a.name}</div>
              <div style={{ width: 16, height: 16, background: a.calendar_color, borderRadius: 4 }} />
              <div
                style={{
                  border: `1px solid ${a.status === 'active' ? 'var(--color-accent)' : '#ddd'}`,
                  color: a.status === 'active' ? 'var(--color-accent)' : '#999',
                  borderRadius: 10,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                {a.status === 'active' ? 'aktiv' : 'inaktiv'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--color-accent)' }}>
                <EditIcon />
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Keine Artists gefunden.</div>}
        </>
      )}
    </div>
  );
}
