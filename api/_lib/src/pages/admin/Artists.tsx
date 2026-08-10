import { useEffect, useMemo, useState } from 'react';
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

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function Artists() {
  const [filter, setFilter] = useState<'alle' | 'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchArtists()
      .then(setArtists)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return artists.filter((a) => {
      if (filter !== 'alle' && a.status !== filter) return false;
      if (search.trim() && !a.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [artists, filter, search]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Admin · Artists</h1>
        <button className="btn btn-primary" onClick={() => navigate('/admin/artists/new')}>
          + Neu
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', padding: '8px 14px', fontSize: 12, borderRadius: 4, width: 220, color: '#555' }}>
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Artist suchen…"
            style={{ border: 'none', outline: 'none', fontSize: 12, width: '100%', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['alle', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '8px 14px', background: filter === f ? '#111' : 'transparent', color: filter === f ? '#fff' : '#555', border: 'none', cursor: 'pointer' }}
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
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 90px 90px 40px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
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
              onMouseEnter={() => setHoveredRow(a.id)}
              onMouseLeave={() => setHoveredRow(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/admin/artists/${a.id}`);
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 90px 90px 40px',
                padding: '14px 12px',
                fontSize: 13,
                borderBottom: '1px solid #eee',
                alignItems: 'center',
                cursor: 'pointer',
                background: hoveredRow === a.id ? '#fbfaf8' : 'transparent',
                outline: 'none',
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: a.calendar_color }} />
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                {a.name}
                {a.is_employee && (
                  <span style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: 10, padding: '1px 8px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                    Mitarbeiter
                  </span>
                )}
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', color: hoveredRow === a.id ? 'var(--color-accent)' : '#ccc' }}>
                <EditIcon />
              </div>
            </div>
          ))}
          {filtered.length === 0 && artists.length > 0 && <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>Keine Artists entsprechen der Suche/dem Filter.</div>}
          {artists.length === 0 && (
            <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>
              Noch keine Artists erfasst. <span onClick={() => navigate('/admin/artists/new')} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>Jetzt anlegen</span>.
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}
