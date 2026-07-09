import { useState } from 'react';

type ViewMode = 'tag' | 'woche' | 'liste';

interface Artist {
  name: string;
  color: string;
  shift: string;
}

interface Appointment {
  time: string;
  label: string;
  customer: string;
  artistIndex: number;
  status: 'kassiert' | 'offen' | 'storniert';
}

const ARTISTS: Artist[] = [
  { name: 'Nina', color: 'var(--color-accent)', shift: '09:00–18:00' },
  { name: 'Tom', color: 'var(--color-slate)', shift: '09:00–16:00' },
];

const TIMESLOTS = ['09:00', '10:30', '13:00', '15:30', '17:00'];

// Mock-Daten (später aus `appointments`-Tabelle via Supabase)
const APPOINTMENTS: Appointment[] = [
  { time: '09:00', label: 'Cover-Up', customer: 'M. Keller', artistIndex: 0, status: 'kassiert' },
  { time: '10:30', label: 'Beratung', customer: 'J. Widmer', artistIndex: 1, status: 'offen' },
  { time: '13:00', label: 'Sleeve S.3', customer: 'L. Frei', artistIndex: 0, status: 'kassiert' },
  { time: '15:30', label: 'Piercing', customer: 'P. Baumann', artistIndex: 1, status: 'kassiert' },
  { time: '17:00', label: 'Kleinmotiv', customer: 'S. Meier', artistIndex: 0, status: 'storniert' },
];

const statusPillStyle = (status: Appointment['status']): React.CSSProperties => {
  const map = {
    kassiert: { border: 'var(--color-accent)', color: 'var(--color-accent)' },
    offen: { border: '#ddd', color: '#777' },
    storniert: { border: 'var(--color-destructive)', color: 'var(--color-destructive)' },
  } as const;
  const c = map[status];
  return {
    border: `1px solid ${c.border}`,
    color: c.color,
    borderRadius: 'var(--radius-pill-desktop)',
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 600,
    width: 'fit-content',
  };
};

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const items: { key: ViewMode; label: string }[] = [
    { key: 'tag', label: 'Tagesansicht' },
    { key: 'woche', label: 'Woche' },
    { key: 'liste', label: 'Liste' },
  ];
  return (
    <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onChange(it.key)}
          style={{
            padding: '7px 14px',
            fontSize: 12,
            border: 'none',
            background: view === it.key ? 'var(--color-primary)' : 'transparent',
            color: view === it.key ? '#fff' : '#555',
            fontWeight: view === it.key ? 600 : 400,
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function DayView() {
  const byArtist = ARTISTS.map((_, i) => APPOINTMENTS.filter((a) => a.artistIndex === i));

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `60px repeat(${ARTISTS.length}, 1fr)`,
          gap: 1,
          background: '#eee',
          border: '1px solid #eee',
        }}
      >
        <div style={{ background: '#fff', padding: 10, fontSize: 11, color: '#999' }}>Zeit</div>
        {ARTISTS.map((artist) => (
          <div key={artist.name} style={{ background: '#fbfaf8', padding: 10, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: artist.color, display: 'inline-block' }} />
              {artist.name}
            </div>
            <div style={{ fontSize: 10, color: '#999' }}>Schicht {artist.shift}</div>
          </div>
        ))}

        {TIMESLOTS.map((slot) => (
          <>
            <div key={slot} style={{ background: '#fff', padding: '24px 10px', fontSize: 11, color: '#999' }}>
              {slot}
            </div>
            {ARTISTS.map((_, artistIndex) => {
              const appt = byArtist[artistIndex].find((a) => a.time === slot);
              return (
                <div key={artistIndex + slot} style={{ background: '#fff', padding: 8 }}>
                  {appt && (
                    <div
                      style={{
                        background: 'var(--color-accent-fill)',
                        borderLeft: `3px solid ${ARTISTS[artistIndex].color}`,
                        borderRadius: '0 4px 4px 0',
                        padding: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      {appt.label} · {appt.customer}
                      {appt.status === 'kassiert' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ARTISTS[artistIndex].color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
        Grau schattierte Zeiten liegen ausserhalb der Arbeitszeit des Artists und können nicht gebucht werden.
      </div>
    </div>
  );
}

function ListView() {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 1fr 1fr 100px',
          padding: '10px 12px',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: '#999',
          borderBottom: '1px solid var(--color-border)',
          fontWeight: 600,
        }}
      >
        <div>Zeit</div>
        <div>Kunde</div>
        <div>Artist</div>
        <div>Service</div>
        <div>Status</div>
      </div>
      {APPOINTMENTS.map((a) => (
        <div
          key={a.time}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 1fr 1fr 100px',
            padding: '14px 12px',
            fontSize: 13,
            borderBottom: '1px solid #eee',
            alignItems: 'center',
          }}
        >
          <div>{a.time}</div>
          <div>{a.customer}</div>
          <div>{ARTISTS[a.artistIndex].name}</div>
          <div>{a.label}</div>
          <div style={statusPillStyle(a.status)}>{a.status}</div>
        </div>
      ))}
    </div>
  );
}

function WeekView() {
  const days = ['Mo 6.', 'Di 7.', 'Mi 8.', 'Do 9.', 'Fr 10.', 'Sa 11.'];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Artist auswählen
        </div>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 14px', fontSize: 13, width: 200 }}>
          Nina ▾
        </div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
          Artist muss gewählt werden — Wochenansicht zeigt jeweils einen Artist
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `60px repeat(${days.length}, 1fr)`,
          gap: 1,
          background: '#eee',
          border: '1px solid #eee',
        }}
      >
        <div style={{ background: '#fbfaf8', padding: 8, fontSize: 11, color: '#999' }}>Zeit</div>
        {days.map((d) => (
          <div
            key={d}
            style={{
              background: d === 'Fr 10.' ? '#F6ECEC' : '#fbfaf8',
              padding: 8,
              fontSize: 12,
              textAlign: 'center',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: d === 'Fr 10.' ? 'var(--color-destructive)' : 'var(--color-primary)',
            }}
          >
            {d}
          </div>
        ))}
        <div style={{ background: '#fff', padding: '20px 8px', fontSize: 11, color: '#999' }}>13:00</div>
        {days.map((d) => (
          <div key={d} style={{ background: d === 'Fr 10.' ? '#F6ECEC' : '#fff', padding: 6 }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
        Tage ohne Schicht werden nicht angezeigt · rot schattierte Tage sind als Absenz gebucht
      </div>
    </div>
  );
}

export default function Kalender() {
  const [view, setView] = useState<ViewMode>('tag');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 26 }}>Kalender</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ViewToggle view={view} onChange={setView} />
          <div style={{ border: '1px solid var(--color-border)', padding: '7px 14px', fontSize: 12, color: '#333', borderRadius: 4 }}>
            Mi, 8. Juli
          </div>
          <div className="btn btn-accent">Heute</div>
        </div>
      </div>

      {view === 'tag' && <DayView />}
      {view === 'woche' && <WeekView />}
      {view === 'liste' && <ListView />}
    </div>
  );
}
