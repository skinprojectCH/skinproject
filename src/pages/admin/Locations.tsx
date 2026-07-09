import { useEffect, useState } from 'react';
import { fetchLocations, type Location } from '../../lib/queries';

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
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations()
      .then((data) => {
        setLocations(data);
        if (data.length) setSelectedId(data[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selected = locations.find((l) => l.id === selectedId);

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;
  if (!selected) return <div style={{ fontSize: 13, color: '#999' }}>Keine Locations vorhanden.</div>;

  const [street, plzOrt] = (selected.address || '').split(',').map((s) => s.trim());

  return (
    <div style={{ display: 'flex', gap: 28 }}>
      <div style={{ width: 360, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Locations</div>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 11 }}>
            + Neu
          </button>
        </div>
        {locations.map((l) => (
          <div
            key={l.id}
            onClick={() => setSelectedId(l.id)}
            style={{ border: l.id === selectedId ? '1.5px solid var(--color-accent)' : '1px solid #eee', borderRadius: 6, padding: 12, marginBottom: 8, cursor: 'pointer' }}
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
          <Field label="Telefon" defaultValue="—" />
        </div>
        <div style={{ margin: '14px 0 6px' }}>
          <Field label="Strasse" defaultValue={street || ''} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0 24px' }}>
          <Field label="PLZ / Ort" defaultValue={plzOrt || ''} />
          <Field label="E-Mail" defaultValue="—" />
        </div>

        <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>MWST</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
            <Field label="MWST-Nummer" defaultValue={selected.vat_number || '—'} />
            <Field label="MWST-Satz in %" defaultValue="8.1 %" />
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>Location-Manager: separate `location_managers`-Tabelle, UI folgt in nächster Iteration.</div>

        <button className="btn btn-primary" style={{ width: 160, justifyContent: 'center', marginTop: 10 }}>
          Speichern
        </button>
      </div>
    </div>
  );
}
