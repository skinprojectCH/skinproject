import { useParams } from 'react-router-dom';

// Mock-Daten (später aus `customers` + `appointments` + `customer_documents` via Supabase)
const MOCK_CUSTOMER = {
  name: 'Keller',
  vorname: 'Michael',
  geburtsdatum: '14.03.1991',
  mobile: '079 555 12 34',
  telefon: '—',
  email: 'm.keller@mail.ch',
  strasse: 'Bahnhofstrasse 12',
  plzOrt: '8000 Zürich',
  notiz: 'Bevorzugt Termine am Nachmittag. Sensible Haut, dünneres Nadel-Setup verwenden.',
  gesundheitshinweise: ['Allergien: Latex', 'Hautkrankheiten/Narben: leichte Narbenbildung am Unterarm'],
  gesamtumsatz: 1840,
};

const MOCK_DOCUMENTS = [
  { name: 'Einverständniserklärung.pdf', note: 'automatisch hochgeladen', deletable: false },
  { name: 'Gesundheitsfragebogen.pdf', note: null, deletable: true },
];

const MOCK_HISTORY = [
  { datum: '12.05.2026', label: 'Sleeve Session 2', artist: 'Nina', betrag: 420, notiz: 'Haut reagiert gut, nächste Session in 6 Wochen.', docs: 2, fotos: 4, status: null },
  { datum: '03.02.2026', label: 'Sleeve Session 1', artist: 'Nina', betrag: 380, notiz: 'Erstsitzung, Vorzeichnung fotografiert.', docs: 1, fotos: 6, status: null },
  { datum: '19.01.2026', label: 'Kleinmotiv', artist: 'Nina', betrag: null, notiz: 'Kunde hat Termin 2 Tage vorher storniert.', docs: 0, fotos: 0, status: 'Absage' },
  { datum: '05.12.2025', label: 'Beratung', artist: 'Nina', betrag: null, notiz: 'Kunde ist ohne Absage nicht erschienen.', docs: 0, fotos: 0, status: 'Nicht erschienen' },
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ margin: '14px 0 6px' }}>
      <div className="label-uppercase" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 13 }}>{value}</div>
    </div>
  );
}

export default function KundeDetail() {
  useParams(); // `id` wird später zum Laden aus Supabase verwendet
  const c = MOCK_CUSTOMER;

  return (
    <div>
      <div style={{ display: 'flex', gap: 28 }}>
        {/* Linke Spalte: Stammdaten, Notizen, Dokumente, Fotos */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <h2 style={{ fontSize: 19, marginBottom: 16 }}>Kunde bearbeiten</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Name" value={c.name} />
            <Field label="Vorname" value={c.vorname} />
          </div>
          <Field label="Geburtsdatum" value={c.geburtsdatum} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Mobile" value={c.mobile} />
            <Field label="Telefon" value={c.telefon} />
          </div>
          <Field label="E-Mail" value={c.email} />
          <Field label="Strasse" value={c.strasse} />
          <div style={{ marginBottom: 20 }}>
            <Field label="PLZ / Ort" value={c.plzOrt} />
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notizen</div>
            <div style={{ fontSize: 12, color: '#555', border: '1px solid #eee', borderRadius: 4, padding: 10, marginBottom: 8, minHeight: 60 }}>
              {c.notiz}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>+ Notiz hinzufügen</div>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Dokumente</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {MOCK_DOCUMENTS.map((doc) => (
                <div
                  key={doc.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    border: '1px solid #eee',
                    borderRadius: 4,
                    padding: '8px 10px',
                  }}
                >
                  <div>
                    {doc.name} {doc.note && <span style={{ color: '#999', fontSize: 10 }}>· {doc.note}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Öffnen</div>
                    {doc.deletable && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>+ Dokument hochladen</div>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Fotos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    background:
                      'repeating-linear-gradient(45deg,#f4f3f0,#f4f3f0 6px,#EFEEEA 6px,#EFEEEA 12px)',
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>+ Foto hochladen</div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Speichern
          </button>
        </div>

        {/* Rechte Spalte: Gesundheitshinweise + Termin-Historie */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ border: '1px solid var(--color-warn-border)', background: 'var(--color-warn-bg)', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8A6D2E', fontWeight: 700, marginBottom: 6 }}>
              Gesundheitshinweise (aus Anmeldeformular)
            </div>
            <div style={{ fontSize: 12, color: '#5a4a20', lineHeight: 1.6 }}>
              {c.gesundheitshinweise.map((h) => (
                <div key={h}>· {h}</div>
              ))}
            </div>
          </div>

          <h3 style={{ fontSize: 16, marginBottom: 2 }}>Vergangene Termine</h3>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            Gesamtumsatz Kunde: CHF {c.gesamtumsatz.toLocaleString('de-CH')}
          </div>

          {MOCK_HISTORY.map((h, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #eee',
                borderRadius: 6,
                padding: 14,
                marginBottom: 10,
                opacity: h.status ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <div>
                  {h.datum} · {h.label} · {h.artist}
                </div>
                {h.status ? (
                  <div
                    style={{
                      border: `1px solid ${h.status === 'Absage' ? 'var(--color-destructive)' : '#ccc'}`,
                      color: h.status === 'Absage' ? 'var(--color-destructive)' : '#777',
                      borderRadius: 10,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {h.status}
                  </div>
                ) : (
                  <div>CHF {h.betrag}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#777', marginBottom: h.status ? 0 : 8 }}>Notiz: {h.notiz}</div>
              {!h.status && (
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: '3px 10px' }}>{h.docs} Dokumente</div>
                  <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: '3px 10px' }}>{h.fotos} Fotos</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
