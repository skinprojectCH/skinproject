import { useEffect, useState } from 'react';
import TerminModal from '../components/TerminModal';
import EditTerminModal from '../components/EditTerminModal';
import { fetchAppointmentsForDay, fetchArtists, fetchLocations, fetchCurrentUserLocationId, fetchShiftsForDate, type Artist, type Location, type Shift } from '../lib/queries';

const FAVORITE_LOCATION_KEY = 'skinproject:favoriteLocationId';

type ViewMode = 'tag' | 'woche' | 'liste';

interface LoadedAppointment {
  id: string;
  time: string;
  startMinutes: number;
  endMinutes: number;
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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'var(--color-accent)' : 'none'} stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

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

const DISPLAY_START_MIN = 8 * 60; // 08:00
const DISPLAY_END_MIN = 20 * 60; // 20:00
const PX_PER_MIN = 1.4; // 1h = 84px
const GRID_HEIGHT = (DISPLAY_END_MIN - DISPLAY_START_MIN) * PX_PER_MIN;

function timeToMinutes(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function shiftWindowsForArtist(shifts: Shift[], artistId: string) {
  return shifts
    .filter((s) => s.artist_id === artistId)
    .map((s) => {
      const [sh, sm] = s.start_time.slice(0, 5).split(':').map(Number);
      const [eh, em] = s.end_time.slice(0, 5).split(':').map(Number);
      return { start: sh * 60 + sm, end: eh * 60 + em };
    })
    .sort((a, b) => a.start - b.start);
}

// Liefert die Zeitbereiche AUSSERHALB der Schicht (innerhalb des angezeigten Fensters) — für die Schraffur.
function offWindowsForArtist(shifts: Shift[], artistId: string) {
  const windows = shiftWindowsForArtist(shifts, artistId);
  const off: { start: number; end: number }[] = [];
  let cursor = DISPLAY_START_MIN;
  for (const w of windows) {
    const start = Math.max(w.start, DISPLAY_START_MIN);
    const end = Math.min(w.end, DISPLAY_END_MIN);
    if (start > cursor) off.push({ start: cursor, end: Math.min(start, DISPLAY_END_MIN) });
    cursor = Math.max(cursor, end);
  }
  if (cursor < DISPLAY_END_MIN) off.push({ start: cursor, end: DISPLAY_END_MIN });
  return off;
}

const HATCH_BG = 'repeating-linear-gradient(45deg, #fafafa, #fafafa 6px, #f0f0f0 6px, #f0f0f0 12px)';

function DayView({ appointments, artists, shifts, onSelectAppointment }: { appointments: LoadedAppointment[]; artists: Artist[]; shifts: Shift[]; onSelectAppointment: (a: LoadedAppointment) => void }) {
  const hourMarks: number[] = [];
  for (let m = DISPLAY_START_MIN; m <= DISPLAY_END_MIN; m += 60) hourMarks.push(m);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
      {/* Kopfzeile: Artist-Namen + Schichtzeiten */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
        <div style={{ width: 56, flexShrink: 0, background: '#fff' }} />
        {artists.map((artist) => {
          const windows = shiftWindowsForArtist(shifts, artist.id);
          const label = windows.length ? windows.map((w) => `${minutesLabel(w.start)}–${minutesLabel(w.end)}`).join(', ') : null;
          return (
            <div key={artist.id} style={{ flex: 1, minWidth: 0, background: '#fbfaf8', padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #eee' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: artist.calendar_color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
              </div>
              <div style={{ fontSize: 10, color: label ? '#999' : 'var(--color-destructive)' }}>{label ? `Schicht ${label}` : 'Kein Dienst heute'}</div>
            </div>
          );
        })}
        {artists.length === 0 && <div style={{ flex: 1, padding: '10px 8px', fontSize: 12, color: '#999' }}>Keine Artists an dieser Location.</div>}
      </div>

      {/* Zeitraster */}
      <div style={{ display: 'flex', position: 'relative' }}>
        {/* Zeitachse */}
        <div style={{ width: 56, flexShrink: 0, position: 'relative', height: GRID_HEIGHT, background: '#fff' }}>
          {hourMarks.map((m) => (
            <div key={m} style={{ position: 'absolute', top: (m - DISPLAY_START_MIN) * PX_PER_MIN - 6, right: 8, fontSize: 10, color: '#999' }}>
              {minutesLabel(m)}
            </div>
          ))}
        </div>

        {/* Spalten */}
        {artists.map((artist) => {
          const offWindows = offWindowsForArtist(shifts, artist.id);
          const artistAppointments = appointments.filter((a) => a.artistId === artist.id);
          return (
            <div
              key={artist.id}
              style={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                height: GRID_HEIGHT,
                borderLeft: '1px solid #eee',
                backgroundImage: `repeating-linear-gradient(180deg, transparent, transparent ${60 * PX_PER_MIN - 1}px, #f2f2f2 ${60 * PX_PER_MIN - 1}px, #f2f2f2 ${60 * PX_PER_MIN}px)`,
              }}
            >
              {offWindows.map((w, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: (w.start - DISPLAY_START_MIN) * PX_PER_MIN,
                    height: Math.max(0, (w.end - w.start) * PX_PER_MIN),
                    left: 0,
                    right: 0,
                    background: HATCH_BG,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {artistAppointments.map((appt) => {
                const top = Math.max(0, (appt.startMinutes - DISPLAY_START_MIN) * PX_PER_MIN);
                const height = Math.max(18, (appt.endMinutes - appt.startMinutes) * PX_PER_MIN);
                return (
                  <div
                    key={appt.id}
                    onClick={() => onSelectAppointment(appt)}
                    style={{
                      position: 'absolute',
                      top,
                      height,
                      left: 4,
                      right: 4,
                      background: 'var(--color-accent-fill)',
                      borderLeft: `3px solid ${appt.artistColor}`,
                      borderRadius: '0 4px 4px 0',
                      padding: '4px 6px',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    }}
                    title={`${appt.time} · ${appt.label} · ${appt.customer}`}
                  >
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.time} · {appt.label}</div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' }}>{appt.customer}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {artists.length === 0 && <div style={{ flex: 1, height: GRID_HEIGHT }} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 11, color: '#999', borderTop: '1px solid #eee' }}>
        <span style={{ width: 12, height: 12, background: HATCH_BG, display: 'inline-block', borderRadius: 2 }} />
        Ausserhalb der Arbeitszeit — kann nicht gebucht werden.
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
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [favoriteLocationId, setFavoriteLocationId] = useState<string | null>(() => localStorage.getItem(FAVORITE_LOCATION_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  // Locations einmalig laden, danach Standort vorauswählen:
  // 1. Standort, der dem eingeloggten Account zugewiesen ist (app_users.location_id) — hat Vorrang
  // 2. sonst lokaler Browser-Favorit
  // 3. sonst die erste Location
  useEffect(() => {
    Promise.all([fetchLocations(), fetchCurrentUserLocationId()])
      .then(([data, accountLocationId]) => {
        setLocations(data);
        const fav = localStorage.getItem(FAVORITE_LOCATION_KEY);
        const accountValid = accountLocationId && data.some((l) => l.id === accountLocationId);
        const favValid = fav && data.some((l) => l.id === fav);
        const initial = accountValid ? accountLocationId! : favValid ? fav! : data[0]?.id || '';
        setSelectedLocationId(initial);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLocationsLoaded(true));
  }, []);

  async function reload() {
    if (!selectedLocationId) return;
    try {
      const [rawAppointments, artistList] = await Promise.all([fetchAppointmentsForDay(date, selectedLocationId), fetchArtists()]);
      const scopedArtists = artistList.filter((a) => a.location_id === selectedLocationId);
      setArtists(scopedArtists);
      const dayShifts = await fetchShiftsForDate(scopedArtists.map((a) => a.id), date);
      setShifts(dayShifts);
      const mapped: LoadedAppointment[] = (rawAppointments as any[]).map((a) => ({
        id: a.id,
        time: formatTime(a.start_time),
        startMinutes: timeToMinutes(a.start_time),
        endMinutes: timeToMinutes(a.end_time),
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
    if (!selectedLocationId) return;
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedLocationId]);

  function toggleFavorite() {
    if (favoriteLocationId === selectedLocationId) {
      localStorage.removeItem(FAVORITE_LOCATION_KEY);
      setFavoriteLocationId(null);
    } else {
      localStorage.setItem(FAVORITE_LOCATION_KEY, selectedLocationId);
      setFavoriteLocationId(selectedLocationId);
    }
  }

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  }

  if (locationsLoaded && locations.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 16 }}>Kalender</h1>
        <div style={{ fontSize: 13, color: '#999' }}>
          Noch keine Location erfasst — unter Admin → Locations zuerst eine anlegen, dann erscheint hier der Kalender.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 26 }}>Kalender</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              style={{ border: '1px solid var(--color-border)', padding: '7px 10px', fontSize: 12, borderRadius: 4, fontFamily: 'var(--font-body)' }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button
              onClick={toggleFavorite}
              title={favoriteLocationId === selectedLocationId ? 'Als Favorit entfernen' : 'Als Favorit markieren'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}
            >
              <StarIcon filled={favoriteLocationId === selectedLocationId} />
            </button>
          </div>
          <ViewToggle view={view} onChange={setView} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => shiftDate(-1)}
              style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--color-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#333', cursor: 'pointer' }}
            >
              ‹
            </button>
            <div style={{ border: '1px solid var(--color-border)', padding: '7px 14px', fontSize: 12, color: '#333', borderRadius: 4 }}>
              {new Date(date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'long' })}
            </div>
            <button
              onClick={() => shiftDate(1)}
              style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--color-bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#333', cursor: 'pointer' }}
            >
              ›
            </button>
          </div>
          <button className="btn btn-accent" onClick={() => setDate(todayISO())}>
            Heute
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewTermin(true)}>
            + Neuer Termin
          </button>
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler beim Laden: {error}</div>}

      {!loading && !error && (
        <>
          {view === 'tag' && <DayView appointments={appointments} artists={artists} shifts={shifts} onSelectAppointment={setSelectedAppointment} />}
          {view === 'woche' && <div style={{ fontSize: 13, color: '#999' }}>Wochenansicht folgt (Mehrtages-Query).</div>}
          {view === 'liste' && <ListView appointments={appointments} />}
        </>
      )}

      {showNewTermin && (
        <TerminModal
          locationId={selectedLocationId}
          initialDate={date}
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
