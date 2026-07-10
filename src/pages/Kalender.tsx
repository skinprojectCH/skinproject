import { useEffect, useState } from 'react';
import TerminModal from '../components/TerminModal';
import EditTerminModal from '../components/EditTerminModal';
import { fetchAppointmentsForDay, fetchArtists, fetchLocations, fetchCurrentUserLocationId, fetchShiftsForDate, fetchAbsencesForDate, type Artist, type Location, type Shift, type Absence } from '../lib/queries';

const FAVORITE_LOCATION_KEY = 'skinproject:favoriteLocationId';

type ViewMode = 'tag' | 'woche' | 'liste';

interface LoadedAppointment {
  id: string;
  dateISO: string;
  time: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  label: string;
  customer: string;
  customerPhone: string | null;
  services: string[];
  artistId: string;
  artistName: string;
  artistColor: string;
  status: string;
}

function mapAppointmentRow(a: any, dateISO: string): LoadedAppointment {
  return {
    id: a.id,
    dateISO,
    time: formatTime(a.start_time),
    endTime: formatTime(a.end_time),
    startMinutes: timeToMinutes(a.start_time),
    endMinutes: timeToMinutes(a.end_time),
    label: a.type === 'absenz' ? 'Absenz' : 'Termin',
    customer: a.customers ? `${a.customers.vorname} ${a.customers.name}` : 'Laufkunde',
    customerPhone: a.customers?.phone || null,
    services: (a.appointment_line_items || []).map((li: any) => li.services?.name).filter(Boolean),
    artistId: a.artist_id,
    artistName: a.artists?.name || '—',
    artistColor: a.artists?.calendar_color || 'var(--color-accent)',
    status: a.status,
  };
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

function useNowMinutes() {
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

const ABSENCE_TYPE_LABELS: Record<string, string> = { ferien: 'Ferien', krank: 'Krank', abwesend: 'Abwesend' };

function absenceForArtist(absences: Absence[], artistId: string) {
  return absences.find((a) => a.artist_id === artistId) || null;
}

// Kombiniert Schicht-basierte Schraffur mit einer gebuchten Absenz.
// Ganztägige Absenz -> kompletter angezeigter Zeitraum blockiert.
// Halbtägige Absenz -> zusätzlich zur normalen Schicht-Schraffur der jeweilige Halbtag.
function offWindowsWithAbsence(shifts: Shift[], absences: Absence[], artistId: string) {
  const absence = absenceForArtist(absences, artistId);
  if (absence && absence.half_day === 'none') {
    return [{ start: DISPLAY_START_MIN, end: DISPLAY_END_MIN }];
  }
  const base = offWindowsForArtist(shifts, artistId);
  if (!absence) return base;
  const half = absence.half_day === 'am' ? { start: DISPLAY_START_MIN, end: 12 * 60 } : { start: 12 * 60, end: DISPLAY_END_MIN };
  return [...base, half];
}

const HATCH_BG = 'repeating-linear-gradient(45deg, #fafafa, #fafafa 6px, #f0f0f0 6px, #f0f0f0 12px)';

function DayView({
  appointments,
  artists,
  shifts,
  absences,
  isToday,
  onSelectAppointment,
  onCreateAtSlot,
}: {
  appointments: LoadedAppointment[];
  artists: Artist[];
  shifts: Shift[];
  absences: Absence[];
  isToday: boolean;
  onSelectAppointment: (a: LoadedAppointment) => void;
  onCreateAtSlot: (artistId: string, time: string) => void;
}) {
  const nowMinutes = useNowMinutes();
  const showNowIndicator = isToday && nowMinutes >= DISPLAY_START_MIN && nowMinutes <= DISPLAY_END_MIN;
  const nowTop = (nowMinutes - DISPLAY_START_MIN) * PX_PER_MIN;
  const hourMarks: number[] = [];
  for (let m = DISPLAY_START_MIN; m <= DISPLAY_END_MIN; m += 60) hourMarks.push(m);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Kopfzeile: Artist-Namen + Schichtzeiten — bleibt fix, scrollt nicht mit */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <div style={{ width: 56, flexShrink: 0, background: '#fff' }} />
        {artists.map((artist) => {
          const windows = shiftWindowsForArtist(shifts, artist.id);
          const label = windows.length ? windows.map((w) => `${minutesLabel(w.start)}–${minutesLabel(w.end)}`).join(', ') : null;
          const absence = absenceForArtist(absences, artist.id);
          let statusText: string;
          if (absence && absence.half_day === 'none') {
            statusText = ABSENCE_TYPE_LABELS[absence.type];
          } else if (absence) {
            statusText = `${label ? `Schicht ${label}` : 'Kein Dienst heute'} · ${ABSENCE_TYPE_LABELS[absence.type]} (${absence.half_day === 'am' ? 'Vorm.' : 'Nachm.'})`;
          } else {
            statusText = label ? `Schicht ${label}` : 'Kein Dienst heute';
          }
          return (
            <div key={artist.id} style={{ flex: 1, minWidth: 0, background: '#fbfaf8', padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #eee' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: artist.calendar_color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
              </div>
              <div style={{ fontSize: 10, color: label || (absence && absence.half_day !== 'none') ? '#999' : 'var(--color-destructive)' }}>{statusText}</div>
            </div>
          );
        })}
        {artists.length === 0 && <div style={{ flex: 1, padding: '10px 8px', fontSize: 12, color: '#999' }}>Keine Artists an dieser Location.</div>}
      </div>

      {/* Zeitraster — einziger scrollbarer Bereich */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          {showNowIndicator && (
            <div
              style={{
                position: 'absolute',
                top: nowTop,
                left: 56,
                right: 0,
                height: 1,
                background: '#111',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Zeitachse */}
          <div style={{ width: 56, flexShrink: 0, position: 'relative', height: GRID_HEIGHT, background: '#fff' }}>
            {hourMarks.map((m) => (
              <div key={m} style={{ position: 'absolute', top: (m - DISPLAY_START_MIN) * PX_PER_MIN - 6, right: 8, fontSize: 10, color: '#999' }}>
                {minutesLabel(m)}
              </div>
            ))}
            {showNowIndicator && (
              <div
                style={{
                  position: 'absolute',
                  top: nowTop - 5,
                  right: -1,
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: '7px solid #111',
                }}
              />
            )}
          </div>

          {/* Spalten */}
          {artists.map((artist) => {
            const offWindows = offWindowsWithAbsence(shifts, absences, artist.id);
            const artistAppointments = appointments.filter((a) => a.artistId === artist.id);
            return (
              <div
                key={artist.id}
                onDoubleClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const offsetY = e.clientY - rect.top;
                  const rawMinutes = DISPLAY_START_MIN + offsetY / PX_PER_MIN;
                  const snapped = Math.round(rawMinutes / 15) * 15;
                  const clamped = Math.min(Math.max(snapped, DISPLAY_START_MIN), DISPLAY_END_MIN - 15);
                  onCreateAtSlot(artist.id, minutesLabel(clamped));
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: 'relative',
                  height: GRID_HEIGHT,
                  borderLeft: '1px solid #eee',
                  cursor: 'copy',
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
                      onDoubleClick={(e) => e.stopPropagation()}
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
                      title={`${appt.time}–${appt.endTime} · ${appt.customer}${appt.services.length ? ' · ' + appt.services.join(', ') : ''}`}
                    >
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>
                        {appt.time} – {appt.endTime}
                      </div>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {appt.customer}
                        {appt.customerPhone ? ` · ${appt.customerPhone}` : ''}
                      </div>
                      {appt.services.length > 0 && (
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' }}>{appt.services.join(', ')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {artists.length === 0 && <div style={{ flex: 1, height: GRID_HEIGHT }} />}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 11, color: '#999', borderTop: '1px solid #eee', flexShrink: 0 }}>
        <span style={{ width: 12, height: 12, background: HATCH_BG, display: 'inline-block', borderRadius: 2 }} />
        Ausserhalb der Arbeitszeit — kann nicht gebucht werden.
      </div>
    </div>
  );
}

function startOfWeekISO(dateISO: string) {
  const d = new Date(dateISO);
  const weekday = (d.getDay() + 6) % 7; // Mo=0 ... So=6
  d.setDate(d.getDate() - weekday);
  return d;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function WeekView({
  artists,
  locationId,
  baseDate,
  refreshKey,
  onSelectAppointment,
  onCreateAtSlot,
}: {
  artists: Artist[];
  locationId: string;
  baseDate: string;
  refreshKey: number;
  onSelectAppointment: (a: LoadedAppointment) => void;
  onCreateAtSlot: (artistId: string, dateISO: string, time: string) => void;
}) {
  const [artistId, setArtistId] = useState(artists[0]?.id || '');
  const [weekAppointments, setWeekAppointments] = useState<Record<string, LoadedAppointment[]>>({});
  const [weekShifts, setWeekShifts] = useState<Record<string, Shift[]>>({});
  const [weekAbsences, setWeekAbsences] = useState<Record<string, Absence[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nowMinutes = useNowMinutes();
  const todayStr = todayISO();

  useEffect(() => {
    if (artists.length && !artists.some((a) => a.id === artistId)) setArtistId(artists[0].id);
  }, [artists, artistId]);

  const monday = startOfWeekISO(baseDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const daysKey = days.join(',');

  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const dayList = daysKey.split(',');
        const [apptResults, shiftResults, absenceResults] = await Promise.all([
          Promise.all(dayList.map((d) => fetchAppointmentsForDay(d, locationId))),
          Promise.all(dayList.map((d) => fetchShiftsForDate([artistId], d))),
          Promise.all(dayList.map((d) => fetchAbsencesForDate([artistId], d))),
        ]);
        const apptMap: Record<string, LoadedAppointment[]> = {};
        const shiftMap: Record<string, Shift[]> = {};
        const absenceMap: Record<string, Absence[]> = {};
        dayList.forEach((d, i) => {
          apptMap[d] = (apptResults[i] as any[]).filter((a) => a.artist_id === artistId).map((a) => mapAppointmentRow(a, d));
          shiftMap[d] = shiftResults[i];
          absenceMap[d] = absenceResults[i];
        });
        setWeekAppointments(apptMap);
        setWeekShifts(shiftMap);
        setWeekAbsences(absenceMap);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [artistId, daysKey, locationId, refreshKey]);

  const hourMarks: number[] = [];
  for (let m = DISPLAY_START_MIN; m <= DISPLAY_END_MIN; m += 60) hourMarks.push(m);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Artist auswählen
        </div>
        <select
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
          style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 14px', fontSize: 13, width: 220, fontFamily: 'var(--font-body)' }}
        >
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Wochenansicht zeigt jeweils einen Artist.</div>
      </div>

      {artists.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>Keine Artists an dieser Location.</div>
      ) : loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Kopfzeile: Wochentage — fix, scrollt nicht mit */}
          <div style={{ display: 'flex', borderBottom: '1px solid #eee', flexShrink: 0 }}>
            <div style={{ width: 56, flexShrink: 0, background: '#fff' }} />
            {days.map((d) => {
              const isToday = d === todayStr;
              const dt = new Date(d);
              const absence = absenceForArtist(weekAbsences[d] || [], artistId);
              return (
                <div key={d} style={{ flex: 1, minWidth: 0, background: isToday ? 'var(--color-accent-fill)' : '#fbfaf8', padding: '10px 4px', textAlign: 'center', borderLeft: '1px solid #eee' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: isToday ? 'var(--color-accent)' : '#111' }}>
                    {WEEKDAY_LABELS[(dt.getDay() + 6) % 7]} {dt.getDate()}.
                  </div>
                  {absence && (
                    <div style={{ fontSize: 9, color: 'var(--color-destructive)' }}>
                      {ABSENCE_TYPE_LABELS[absence.type]}
                      {absence.half_day !== 'none' ? ` (${absence.half_day === 'am' ? 'Vorm.' : 'Nachm.'})` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zeitraster — einziger scrollbarer Bereich */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', position: 'relative' }}>
              <div style={{ width: 56, flexShrink: 0, position: 'relative', height: GRID_HEIGHT, background: '#fff' }}>
                {hourMarks.map((m) => (
                  <div key={m} style={{ position: 'absolute', top: (m - DISPLAY_START_MIN) * PX_PER_MIN - 6, right: 8, fontSize: 10, color: '#999' }}>
                    {minutesLabel(m)}
                  </div>
                ))}
              </div>

              {days.map((d) => {
                const dayShifts = weekShifts[d] || [];
                const offWindows = offWindowsWithAbsence(dayShifts, weekAbsences[d] || [], artistId);
                const dayAppointments = weekAppointments[d] || [];
                const isToday = d === todayStr;
                const showNowLine = isToday && nowMinutes >= DISPLAY_START_MIN && nowMinutes <= DISPLAY_END_MIN;
                const artistColor = artists.find((a) => a.id === artistId)?.calendar_color || 'var(--color-accent)';
                return (
                  <div
                    key={d}
                    onDoubleClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top;
                      const rawMinutes = DISPLAY_START_MIN + offsetY / PX_PER_MIN;
                      const snapped = Math.round(rawMinutes / 15) * 15;
                      const clamped = Math.min(Math.max(snapped, DISPLAY_START_MIN), DISPLAY_END_MIN - 15);
                      onCreateAtSlot(artistId, d, minutesLabel(clamped));
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      position: 'relative',
                      height: GRID_HEIGHT,
                      borderLeft: '1px solid #eee',
                      cursor: 'copy',
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

                    {showNowLine && (
                      <div style={{ position: 'absolute', top: (nowMinutes - DISPLAY_START_MIN) * PX_PER_MIN, left: 0, right: 0, height: 1, background: '#111', zIndex: 5, pointerEvents: 'none' }} />
                    )}

                    {dayAppointments.map((appt) => {
                      const top = Math.max(0, (appt.startMinutes - DISPLAY_START_MIN) * PX_PER_MIN);
                      const height = Math.max(16, (appt.endMinutes - appt.startMinutes) * PX_PER_MIN);
                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAppointment(appt);
                          }}
                          onDoubleClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top,
                            height,
                            left: 2,
                            right: 2,
                            background: 'var(--color-accent-fill)',
                            borderLeft: `3px solid ${artistColor}`,
                            borderRadius: '0 4px 4px 0',
                            padding: '2px 4px',
                            fontSize: 10,
                            fontWeight: 500,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                          }}
                          title={`${appt.time}–${appt.endTime} · ${appt.customer}${appt.services.length ? ' · ' + appt.services.join(', ') : ''}`}
                        >
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }}>
                            {appt.time}–{appt.endTime}
                          </div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.customer}</div>
                          {appt.services.length > 0 && (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555' }}>{appt.services.join(', ')}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 11, color: '#999', borderTop: '1px solid #eee', flexShrink: 0 }}>
            <span style={{ width: 12, height: 12, background: HATCH_BG, display: 'inline-block', borderRadius: 2 }} />
            Ausserhalb der Arbeitszeit — kann nicht gebucht werden.
          </div>
        </div>
      )}
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
  const [newTerminPrefill, setNewTerminPrefill] = useState<{ artistId?: string; time?: string; date?: string }>({});
  const [selectedAppointment, setSelectedAppointment] = useState<LoadedAppointment | null>(null);
  const [appointments, setAppointments] = useState<LoadedAppointment[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [favoriteLocationId, setFavoriteLocationId] = useState<string | null>(() => localStorage.getItem(FAVORITE_LOCATION_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      const scopedArtists = artistList.filter((a) => a.location_id === selectedLocationId && a.status === 'active');
      setArtists(scopedArtists);
      const dayShifts = await fetchShiftsForDate(scopedArtists.map((a) => a.id), date);
      setShifts(dayShifts);
      const dayAbsences = await fetchAbsencesForDate(scopedArtists.map((a) => a.id), date);
      setAbsences(dayAbsences);
      const mapped: LoadedAppointment[] = (rawAppointments as any[]).map((a) => mapAppointmentRow(a, date));
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
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
          <button className="btn btn-primary" onClick={() => { setNewTerminPrefill({}); setShowNewTermin(true); }}>
            + Neuer Termin
          </button>
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler beim Laden: {error}</div>}

      {!loading && !error && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {view === 'tag' && (
            <DayView
              appointments={appointments}
              artists={artists}
              shifts={shifts}
              absences={absences}
              isToday={date === todayISO()}
              onSelectAppointment={setSelectedAppointment}
              onCreateAtSlot={(artistId, time) => {
                setNewTerminPrefill({ artistId, time });
                setShowNewTermin(true);
              }}
            />
          )}
          {view === 'woche' && (
            <WeekView
              artists={artists}
              locationId={selectedLocationId}
              baseDate={date}
              refreshKey={refreshKey}
              onSelectAppointment={setSelectedAppointment}
              onCreateAtSlot={(artistId, dateISO, time) => {
                setNewTerminPrefill({ artistId, time, date: dateISO });
                setShowNewTermin(true);
              }}
            />
          )}
          {view === 'liste' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <ListView appointments={appointments} />
            </div>
          )}
        </div>
      )}

      {showNewTermin && (
        <TerminModal
          locationId={selectedLocationId}
          initialDate={newTerminPrefill.date || date}
          initialTime={newTerminPrefill.time}
          initialArtistId={newTerminPrefill.artistId}
          onClose={() => setShowNewTermin(false)}
          onSave={() => {
            setShowNewTermin(false);
            reload();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      {selectedAppointment && (
        <EditTerminModal
          appointmentId={selectedAppointment.id}
          onClose={() => {
            setSelectedAppointment(null);
            reload();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
