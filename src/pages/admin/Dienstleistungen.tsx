import { useState } from 'react';
import Modal from '../../components/Modal';

const CATEGORIES = ['Tattoo', 'Piercing', 'Beratung'];

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  category: string;
  active: boolean;
}

const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'Sleeve Session', price: 380, duration: 180, description: 'Ganzer Ärmel, mehrere Sitzungen', category: 'Tattoo', active: true },
  { id: 's2', name: 'Cover-Up klein', price: 220, duration: 90, description: 'Bis 10x10cm', category: 'Tattoo', active: true },
  { id: 's3', name: 'Piercing Ohr', price: 60, duration: 20, description: 'inkl. Schmuck Basis', category: 'Piercing', active: true },
  { id: 's4', name: 'Beratung', price: 0, duration: 30, description: 'Kostenlose Erstberatung', category: 'Beratung', active: false },
];

function EditServiceModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const [active, setActive] = useState(service.active);
  return (
    <Modal title="Dienstleistung bearbeiten" onClose={onClose}>
      <FieldInput label="Name" defaultValue={service.name} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FieldInput label="Preis CHF" defaultValue={service.price.toFixed(2)} />
        <FieldInput label="Dauer (min)" defaultValue={String(service.duration)} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Kategorie
        </div>
        <select defaultValue={service.category} style={inputStyle}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Beschreibung
        </div>
        <textarea defaultValue={service.description} style={{ ...inputStyle, minHeight: 48, fontFamily: 'var(--font-body)' }} />
      </div>
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Status</div>
        <div onClick={() => setActive((a) => !a)} style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11, cursor: 'pointer' }}>
          <div style={{ padding: '4px 10px', background: active ? '#111' : 'transparent', color: active ? '#fff' : '#999' }}>Aktiv</div>
          <div style={{ padding: '4px 10px', background: !active ? '#111' : 'transparent', color: !active ? '#fff' : '#999' }}>Inaktiv</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Speichern
        </button>
      </div>
    </Modal>
  );
}

function FieldInput({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="label-uppercase" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <input defaultValue={defaultValue} style={inputStyle} />
    </div>
  );
}

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' };

export default function Dienstleistungen() {
  const [category, setCategory] = useState('Alle');
  const [editing, setEditing] = useState<Service | null>(null);

  const filtered = MOCK_SERVICES.filter((s) => category === 'Alle' || s.category === category);

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="label-uppercase">Kategorie</div>
          <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>+ Neu</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
          <div
            onClick={() => setCategory('Alle')}
            style={{ padding: '8px 10px', background: category === 'Alle' ? '#111' : 'transparent', color: category === 'Alle' ? '#fff' : '#555', borderRadius: 4, marginBottom: 4, cursor: 'pointer' }}
          >
            Alle
          </div>
          {CATEGORIES.map((c) => (
            <div
              key={c}
              onClick={() => setCategory(c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: category === c ? '#111' : 'transparent',
                color: category === c ? '#fff' : '#555',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              <div>{c}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24 }}>Dienstleistungen</h1>
          <button className="btn btn-primary">+ Neuer Service</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 90px 1.5fr 100px 80px 50px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
          <div>Name</div>
          <div>Preis</div>
          <div>Dauer</div>
          <div>Beschreibung</div>
          <div>Kategorie</div>
          <div>Status</div>
          <div />
        </div>

        {filtered.map((s) => (
          <div
            key={s.id}
            onClick={() => setEditing(s)}
            style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 90px 1.5fr 100px 80px 50px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', cursor: 'pointer' }}
          >
            <div>{s.name}</div>
            <div>CHF {s.price}</div>
            <div>{s.duration} min</div>
            <div style={{ color: '#777' }}>{s.description}</div>
            <div>{s.category}</div>
            <div
              style={{
                border: `1px solid ${s.active ? 'var(--color-accent)' : '#ddd'}`,
                color: s.active ? 'var(--color-accent)' : '#999',
                borderRadius: 10,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 600,
                width: 'fit-content',
              }}
            >
              {s.active ? 'aktiv' : 'inaktiv'}
            </div>
            <div />
          </div>
        ))}
        <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Klick auf eine Zeile öffnet die Bearbeitung.</div>
      </div>

      {editing && <EditServiceModal service={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
