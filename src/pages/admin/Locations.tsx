import { useState } from 'react';

interface Manager {
  id: string;
  name: string;
  vorname: string;
  email: string;
  telefon: string;
}

const MOCK_LOCATIONS = [
  { id: 'l1', name: 'SkinProject Zürich', address: 'Langstrasse 4, 8004 Zürich' },
  { id: 'l2', name: 'SkinProject Bern', address: 'Marktgasse 22, 3011 Bern' },
];

const INITIAL_MANAGERS: Manager[] = [
  { id: 'm1', name: 'Hofer', vorname: 'Sandra', email: 'sandra.hofer@skinproject.ch', telefon: '079 333 44 55' },
  { id: 'm2', name: 'Rossi', vorname: 'Tom', email: 'tom@skinproject.ch', telefon: '079 888 22 11' },
];

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <div className="label-uppercase" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div contentEditable suppressContentEditableWarning style={{ borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 13 }}>
        {defaultValue}
      </div>
    </div>
  );
}

export default function Locations() {
  const [selectedId, setSelectedId] = useState(MOCK_LOCATIONS[0].id);
  const [managers, setManagers] = useState(INITIAL_MANAGERS);
  const selected = MOCK_LOCATIONS.find((l) => l.id === selectedId)!;

  function removeManager(id: string) {
    setManagers((prev) => prev.filter((m) => m.id !== id));
  }

  function addManager() {
    setManagers((prev) => [...prev, { id: crypto.randomUUID(), name: '', vorname: '', email: '', telefon: '' }]);
  }

  return (
    <div style={{ display: 'flex', gap: 28 }}>
      <div style={{ width: 360, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Locations</div>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11 }}>
            + Neu
          </button>
        </div>
        {MOCK_LOCATIONS.map((l) => (
          <div
            key={l.id}
            onClick={() => setSelectedId(l.id)}
            style={{
              border: l.id === selectedId ? '1.5px solid var(--color-accent)' : '1px solid #eee',
              borderRadius: 6,
              padding: 12,
              marginBottom: 8,
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{l.name}</div>
            <div style={{ fontSize: 12, color: '#777' }}>{l.address}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: 19, marginBottom: 16 }}>{selected.name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
          <Field label="Name" defaultValue={selected.name} />
          <Field label="Telefon" defaultValue="044 555 66 77" />
        </div>
        <div style={{ margin: '14px 0 6px' }}>
          <Field label="Strasse" defaultValue={selected.address.split(',')[0]} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0 24px' }}>
          <Field label="PLZ / Ort" defaultValue={selected.address.split(',')[1]?.trim() || ''} />
          <Field label="E-Mail" defaultValue="zuerich@skinproject.ch" />
        </div>

        <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>MWST</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
            <Field label="MWST-Nummer" defaultValue="CHE-123.456.789" />
            <Field label="MWST-Satz in %" defaultValue="8.1 %" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 16, border: '1.5px solid #111', background: '#111', borderRadius: 4, color: '#fff', fontSize: 11, textAlign: 'center', lineHeight: '16px' }}>
              ✓
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>MWST-Nummer & Satz für alle Locations gleich verwenden</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Location-Manager</div>
          <div onClick={addManager} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
            + Manager hinzufügen
          </div>
        </div>

        {managers.map((m) => (
          <div key={m.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 10, position: 'relative' }}>
            <div onClick={() => removeManager(m.id)} style={{ position: 'absolute', top: 12, right: 12, color: '#999', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 }}>
              <Field label="Name" defaultValue={m.name} />
              <Field label="Vorname" defaultValue={m.vorname} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <Field label="E-Mail" defaultValue={m.email} />
              <Field label="Telefon" defaultValue={m.telefon} />
            </div>
          </div>
        ))}

        <button className="btn btn-primary" style={{ width: 160, justifyContent: 'center', marginTop: 10 }}>
          Speichern
        </button>
      </div>
    </div>
  );
}
