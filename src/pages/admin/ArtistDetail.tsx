import { useState } from 'react';

const MOCK_SERVICES = ['Sleeve', 'Cover-Up', 'Piercing', 'Kleinmotiv'];
const ARTIST_COLORS = ['#B08D3D', '#7A8A99', '#8B5A5A', '#6B5B45'];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div className="label-uppercase" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 13 }}>{value}</div>
    </div>
  );
}

function Toggle({ value }: { value: boolean }) {
  return (
    <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', fontSize: 11 }}>
      <div style={{ padding: '4px 10px', background: value ? '#111' : 'transparent', color: value ? '#fff' : '#999' }}>Aktiv</div>
      <div style={{ padding: '4px 10px', background: !value ? '#111' : 'transparent', color: !value ? '#fff' : '#999' }}>Inaktiv</div>
    </div>
  );
}

export default function ArtistDetail() {
  const [selectedServices, setSelectedServices] = useState<Record<string, boolean>>({
    Sleeve: true,
    'Cover-Up': true,
    Piercing: false,
    Kleinmotiv: true,
  });
  const [selectedColor, setSelectedColor] = useState(ARTIST_COLORS[0]);

  function toggleService(name: string) {
    setSelectedServices((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div style={{ display: 'flex', gap: 28 }}>
      <div style={{ width: 360, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 19 }}>Nina Berger</h2>
          <Toggle value />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Name" value="Berger" />
          <Field label="Vorname" value="Nina" />
        </div>
        <div style={{ margin: '14px 0 6px' }}>
          <Field label="Strasse" value="Langstrasse 4" />
        </div>
        <div style={{ margin: '14px 0 6px' }}>
          <Field label="PLZ / Ort" value="8004 Zürich" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '14px 0 6px' }}>
          <Field label="Telefon" value="079 888 22 11" />
          <Field label="E-Mail" value="nina@skinproject.ch" />
        </div>
        <div style={{ margin: '14px 0 6px' }}>
          <Field label="PWA Passwort" value="••••••••" />
        </div>
        <div style={{ margin: '14px 0 6px' }}>
          <Field label="AHV-Nummer" value="756.1234.5678.90" />
        </div>
        <div style={{ margin: '14px 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12 }}>MwSt.</div>
          <Toggle value />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 14, margin: '10px 0 6px' }}>
          <Field label="MwSt.-Nummer" value="CHE-123.456.789" />
          <Field label="MwSt. %" value="8.1 %" />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Umsatzbeteiligung in %
          </div>
          <input defaultValue="60" style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: 120 }} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>z.B. 60% Artist / 40% SkinProject (nur auf Dienstleistungen)</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Dienstleistungen zuweisen</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MOCK_SERVICES.map((s) => (
              <div
                key={s}
                onClick={() => toggleService(s)}
                style={{
                  border: selectedServices[s] ? '1px solid #111' : '1px solid #ddd',
                  background: selectedServices[s] ? '#111' : 'transparent',
                  color: selectedServices[s] ? '#fff' : '#999',
                  borderRadius: 12,
                  padding: '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {selectedServices[s] ? '☑' : '☐'} {s}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Artist-PWA Link
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 12, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
              <div>app.skinproject.ch/artist/nina-berger</div>
              <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Kopieren</div>
            </div>
            <div
              style={{
                width: 64,
                height: 64,
                flexShrink: 0,
                border: '1px solid #ddd',
                borderRadius: 4,
                background: 'repeating-conic-gradient(#111 0% 25%, #fff 0% 50%) 0 0/8px 8px',
              }}
            />
          </div>
        </div>

        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Farbe auswählen für Termine im Kalender
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {ARTIST_COLORS.map((c) => (
              <div
                key={c}
                onClick={() => setSelectedColor(c)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: c,
                  border: selectedColor === c ? '2px solid #111' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>Wichtig für Statistiken und Kasse</div>
        </div>
      </div>
    </div>
  );
}
