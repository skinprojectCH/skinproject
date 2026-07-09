import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock-Daten (später aus `customers`-Tabelle via Supabase)
const MOCK_CUSTOMERS = [
  { id: 'c1', name: 'Keller', vorname: 'Michael', mobile: '079 555 12 34', email: 'm.keller@mail.ch', ort: 'Zürich' },
  { id: 'c2', name: 'Widmer', vorname: 'Julia', mobile: '078 222 45 11', email: 'j.widmer@mail.ch', ort: 'Winterthur' },
  { id: 'c3', name: 'Frei', vorname: 'Laura', mobile: '076 333 98 21', email: 'l.frei@mail.ch', ort: 'Zürich' },
  { id: 'c4', name: 'Baumann', vorname: 'Pascal', mobile: '079 111 22 33', email: 'p.baumann@mail.ch', ort: 'Dietikon' },
];

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function Kunden() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = MOCK_CUSTOMERS.filter((c) =>
    `${c.name} ${c.vorname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Kunden</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Suche Name, Vorname…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: '1px solid var(--color-border)', padding: '8px 14px', fontSize: 12, borderRadius: 4, width: 220 }}
          />
          <button className="btn btn-primary">+ Neu</button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 50px',
          padding: '10px 12px',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: '#999',
          borderBottom: '1px solid var(--color-border)',
          fontWeight: 600,
        }}
      >
        <div>Name</div>
        <div>Vorname</div>
        <div>Mobile</div>
        <div>E-Mail</div>
        <div>Ort</div>
        <div />
      </div>

      {filtered.map((c) => (
        <div
          key={c.id}
          onClick={() => navigate(`/kunden/${c.id}`)}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 50px',
            padding: '14px 12px',
            fontSize: 13,
            borderBottom: '1px solid #eee',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div>{c.name}</div>
          <div>{c.vorname}</div>
          <div>{c.mobile}</div>
          <div>{c.email}</div>
          <div>{c.ort}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--color-accent)' }}>
            <EditIcon />
          </div>
        </div>
      ))}
    </div>
  );
}
