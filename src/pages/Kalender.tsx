import { useEffect, useState } from 'react';
import TerminModal from '../components/TerminModal';
import EditTerminModal from '../components/EditTerminModal';
import { fetchAppointmentsForDay, fetchArtists, type Artist } from '../lib/queries';

type ViewMode = 'tag' | 'woche' | 'liste';

interface LoadedAppointment {
  id: string;
  time: string;
  label: string;
  customer: string;
  artistId: string;
  artistName: string;
  artistColor: string;
  status: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

const statusPillStyle = (status: string): React.CSSProperties => {
  const map: Record<string, { border: string; color: string }> = {
    kassiert: { border: 'var(--color-accent)', color: 'var(--color-accent)' },
    gebucht: { border: '#ddd', color: '#777' },
    storniert: { border: 'var(--color-destructive)', color: 'var(--color-destructive)' },
    nicht_erschienen: { border: '#ddd', color: '#777' },
  };
  const c = map[status] || map.gebucht;
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

function DayView({ appointments, artists, onSelectAppointment }: { appointments: LoadedAppointment[]; artists: Artist[]; onSelectAppointment: (a: LoadedAppointment) => void }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${artists.length || 1}, 1fr)`, gap: 1, background: '#eee', border: '1px solid #eee' }}>
        <div style={{ background: '#fff', padding: 10, fontSize: 11, color: '#999' }}>Zeit</div>
        {artists.map((artist) => (
          <div key={artist.id} style={{ background: '#fbfaf8', padding: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: artist.calendar_color, display: 'inline-block' }} />
              {artist.name}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#eee', border: '1px solid #eee', borderTop: 'none' }}>
        {appointments.length === 0 && <div style={{ background: '#fff', padding: 24, textAlign: 'center', fontSize: 13, color: '#999' }}>Keine Termine für diesen Tag.</div>}
        {appointments.map((appt) => (
          <div
            key={appt.id}
            onClick={() => onSelectAppointment(appt)}
            style={{
              background: 'var(--color-accent-fill)',
              borderLeft: `3px solid ${appt.artistColor}`,
              padding: 10,
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div>
              {appt.time} · {appt.label} · {appt.customer} <span style={{ color: '#999' }}>({appt.artistName})</span>
            </div>
            <div style={statusPillStyle(appt.status)}>{appt.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({ appointments }: { appointments: LoadedAppointment[] }) {
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
      {appointments.map((a) => (
        <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 100px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center' }}>
          <div>{a.time}</div>
          <div>{a.customer}</div>
          <div>{a.artistName}</div>
          <div>{a.label}</div>
          <div style={statusPillStyle(a.status)}>{a.status}</div>
        </div>
      ))}
      {appointments.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Keine Termine für diesen Tag.</div>}
    </div>
  );
}

export default function Kalender() {
  const [view, setView] = useState<ViewMode>('tag');
  const [showNewTermin, setShowNewTermin] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<LoadedAppointment | null>(null);
  const [appointments, setAppointments] = useState<LoadedAppointment[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date] = useState(todayISO());

  async function reload() {
    try {
      const [rawAppointments, artistList] = await Promise.all([fetchAppointmentsForDay(date), fetchArtists()]);
      setArtists(artistList);
      const mapped: LoadedAppointment[] = (rawAppointments as any[]).map((a) => ({
        id: a.id,
        time: formatTime(a.start_time),
        label: a.type === 'absenz' ? 'Absenz' : 'Termin',
        customer: a.customers ? `${a.customers.vorname} ${a.customers.name}` : 'Laufkunde',
        artistId: a.artist_id,
        artistName: a.artists?.name || '—',
        artistColor: a.artists?.calendar_color || 'var(--color-accent)',
        status: a.status,
      }));
      setAppointments(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 26 }}>Kalender</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ViewToggle view={view} onChange={setView} />
          <div style={{ border: '1px solid var(--color-border)', padding: '7px 14px', fontSize: 12, color: '#333', borderRadius: 4 }}>
            {new Date(date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'long' })}
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewTermin(true)}>
            + Neuer Termin
          </button>
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler beim Laden: {error}</div>}

      {!loading && !error && (
        <>
          {view === 'tag' && <DayView appointments={appointments} artists={artists} onSelectAppointment={setSelectedAppointment} />}
          {view === 'woche' && <div style={{ fontSize: 13, color: '#999' }}>Wochenansicht folgt (Mehrtages-Query).</div>}
          {view === 'liste' && <ListView appointments={appointments} />}
        </>
      )}

      {showNewTermin && (
        <TerminModal
          onClose={() => setShowNewTermin(false)}
          onSave={() => {
            setShowNewTermin(false);
            reload();
          }}
        />
      )}
      {selectedAppointment && (
        <EditTerminModal
          appointmentId={selectedAppointment.id}
          onClose={() => {
            setSelectedAppointment(null);
            reload();
          }}
          customer={selectedAppointment.customer}
          artist={selectedAppointment.artistName}
          date={new Date(date).toLocaleDateString('de-CH')}
          time={selectedAppointment.time}
          serviceName={selectedAppointment.label}
          durationMin={90}
          price={220}
        />
      )}
    </div>
  );
}
