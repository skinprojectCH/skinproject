import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomers, createCustomer, type Customer } from '../lib/queries';
import Modal from '../components/Modal';

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const vornameValid = vorname.trim().length > 0;
  const nameValid = name.trim().length > 0;

  async function handleCreate() {
    setAttempted(true);
    if (!vornameValid || !nameValid) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createCustomer({
        vorname: vorname.trim(),
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        birthdate: birthdate || null,
      });
      onCreated(created.id);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Neuer Kunde" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Vorname
          </div>
          <input
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            style={attempted && !vornameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}
            autoFocus
          />
          {attempted && !vornameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Pflichtfeld.</div>}
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Name
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={attempted && !nameValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
          {attempted && !nameValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Pflichtfeld.</div>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Mobile
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="optional" />
        </div>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            E-Mail
          </div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="optional" />
        </div>
      </div>
      <div style={{ marginBottom: 22 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Geburtsdatum
        </div>
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} />
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
