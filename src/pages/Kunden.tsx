import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomers, type Customer } from '../lib/queries';
import NewCustomerModal from '../components/NewCustomerModal';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => `${c.name} ${c.vorname}`.toLowerCase().includes(search.toLowerCase()));

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
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + Neu
          </button>
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)', marginBottom: 16 }}>Fehler beim Laden: {error}</div>}

      {!loading && !error && (
        <>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 40px',
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
            <div>Geburtsdatum</div>
            <div />
          </div>

          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/kunden/${c.id}`)}
              onMouseEnter={() => setHoveredRow(c.id)}
              onMouseLeave={() => setHoveredRow(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/kunden/${c.id}`);
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 40px',
                padding: '14px 12px',
                fontSize: 13,
                borderBottom: '1px solid #eee',
                alignItems: 'center',
                cursor: 'pointer',
                background: hoveredRow === c.id ? '#fbfaf8' : 'transparent',
                outline: 'none',
              }}
            >
              <div>{c.name}</div>
              <div>{c.vorname}</div>
              <div>{c.phone || '—'}</div>
              <div>{c.email || '—'}</div>
              <div>{c.birthdate || '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', color: hoveredRow === c.id ? 'var(--color-accent)' : '#ccc' }}>
                <EditIcon />
              </div>
            </div>
          ))}

          {filtered.length === 0 && customers.length > 0 && <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>Keine Kunden entsprechen der Suche.</div>}
          {customers.length === 0 && (
            <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>
              Noch keine Kunden erfasst. <span onClick={() => setShowNew(true)} style={{ color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>Jetzt anlegen</span>.
            </div>
          )}
          </div>
        </>
      )}

      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            navigate(`/kunden/${id}`);
          }}
        />
      )}
    </div>
  );
}
