import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_ARTISTS = [
  { id: 'a1', name: 'Berger', vorname: 'Nina', color: '#B08D3D', status: 'aktiv' as const },
  { id: 'a2', name: 'Rossi', vorname: 'Tom', color: '#7A8A99', status: 'aktiv' as const },
  { id: 'a3', name: 'Suter', vorname: 'Elif', color: '#8B5A5A', status: 'inaktiv' as const },
];

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function Artists() {
  const [filter, setFilter] = useState<'alle' | 'aktiv' | 'inaktiv'>('alle');
  const navigate = useNavigate();

  const filtered = MOCK_ARTISTS.filter((a) => filter === 'alle' || a.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Admin · Artists</h1>
        <button className="btn btn-primary">+ Neu</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Artist suchen…" style={{ border: '1px solid var(--color-border)', padding: '8px 14px', fontSize: 12, borderRadius: 4, width: 220 }} />
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['alle', 'aktiv', 'inaktiv'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '8px 14px', background: filter === f ? '#111' : 'transparent', color: filter === f ? '#fff' : '#555', border: 'none', textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 90px 90px 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
        <div />
        <div>Name</div>
        <div>Vorname</div>
        <div>Farbe</div>
        <div>Status</div>
        <div />
      </div>

      {filtered.map((a) => (
        <div
          key={a.id}
          onClick={() => navigate(`/admin/artists/${a.id}`)}
          style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 90px 90px 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', cursor: 'pointer' }}
        >
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: a.color }} />
          <div>{a.name}</div>
          <div>{a.vorname}</div>
          <div style={{ width: 16, height: 16, background: a.color, borderRadius: 4 }} />
          <div
            style={{
              border: `1px solid ${a.status === 'aktiv' ? 'var(--color-accent)' : '#ddd'}`,
              color: a.status === 'aktiv' ? 'var(--color-accent)' : '#999',
              borderRadius: 10,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 600,
              width: 'fit-content',
            }}
          >
            {a.status}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--color-accent)' }}>
            <EditIcon />
          </div>
        </div>
      ))}
    </div>
  );
}
