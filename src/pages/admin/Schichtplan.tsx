import { useEffect, useState } from 'react';
import { fetchLocations, fetchArtists, fetchShiftDaysForMonth, replaceArtistShiftDaysForMonth, type Location, type Artist } from '../../lib/queries';

interface Slot {
  id: string;
  from: string;
  to: string;
  locationId: string;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']; // Index 0 = Montag
const MONTH_LABELS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const selectStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-body)' };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isoDate(year: number, month0: number, day: number) {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

// JS: So=0..Sa=6 -> wir wollen Mo=0..So=6 (passend zu WEEKDAY_LABELS).
function weekdayOf(year: number, month0: number, day: number) {
  return (new Date(year, month0, day).getDay() + 6) % 7;
}

// Baut die Liste aller Kalendertage eines Monats mit Datum/Wochentag, für die Anzeige und
// für "Monat kopieren" (letztes Vorkommen jedes Wochentags im Monat als Vorlage).
function daysOf(year: number, month0: number) {
  const total = daysInMonth(year, month0);
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    return { date: isoDate(year, month0, day), day, weekday: weekdayOf(year, month0, day) };
  });
}

function emptySchedule(year: number, month0: number): Record<string, Slot[]> {
  const sched: Record<string, Slot[]> = {};
  for (const d of daysOf(year, month0)) sched[d.date] = [];
  return sched;
}

function addMonths(year: number, month0: number, delta: number) {
  const total = year * 12 + month0 + delta;
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

async function downloadMonthPdf(opts: {
  artistName: string;
  monthLabel: string;
  days: { date: string; day: number; weekday: number }[];
  schedule: Record<string, Slot[]>;
  locationNameById: Record<string, string>;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text('Schichtplan', 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${opts.artistName} · ${opts.monthLabel}`, 14, y);
  y += 12;
  doc.setTextColor(0);
  doc.setFontSize(10);

  for (const d of opts.days) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    const slots = opts.schedule[d.date] || [];
    const dateLabel = `${WEEKDAY_LABELS[d.weekday]} ${pad2(d.day)}.`;
    if (slots.length === 0) {
      doc.setTextColor(170);
      doc.text(dateLabel, 14, y);
      doc.text('frei', 55, y);
      doc.setTextColor(0);
      y += 6;
    } else {
      doc.text(dateLabel, 14, y);
      const text = slots.map((s) => `${s.from}–${s.to} (${opts.locationNameById[s.locationId] || '—'})`).join('   ·   ');
      const wrapped = doc.splitTextToSize(text, 140);
      doc.text(wrapped, 55, y);
      y += 6 * wrapped.length;
    }
  }

  const filenameSafe = (s: string) => s.replace(/[^\w-]+/g, '_');
  doc.save(`Schichtplan_${filenameSafe(opts.artistName)}_${filenameSafe(opts.monthLabel)}.pdf`);
}

export default function Schichtplan() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState('');

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month0, setMonth0] = useState(today.getMonth()); // 0-indexiert

  const [schedule, setSchedule] = useState<Record<string, Slot[]>>(emptySchedule(today.getFullYear(), today.getMonth()));
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null); // Hinweistext "Kopie von ... - noch nicht gespeichert"

  const [loading, setLoading] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([fetchLocations(), fetchArtists()])
      .then(([locs, arts]) => {
        setLocations(locs);
        setArtists(arts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activeArtists = artists.filter((a) => a.status === 'active');

  useEffect(() => {
    if (activeArtists.length && !activeArtists.some((a) => a.id === selectedArtistId)) {
      setSelectedArtistId(activeArtists[0].id);
    } else if (activeArtists.length === 0) {
      setSelectedArtistId('');
      setSchedule(emptySchedule(year, month0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArtists.length]);

  function monthBounds(y: number, m0: number) {
    return { start: isoDate(y, m0, 1), end: isoDate(y, m0, daysInMonth(y, m0)) };
  }

  function loadMonth(y: number, m0: number) {
    if (!selectedArtistId || locations.length === 0) return;
    setLoadingShifts(true);
    setSaved(false);
    setSaveError(null);
    setCopiedFrom(null);
    const { start, end } = monthBounds(y, m0);
    fetchShiftDaysForMonth(selectedArtistId, start, end)
      .then((rows) => {
        const next = emptySchedule(y, m0);
        for (const r of rows) {
          const key = r.shift_date;
          if (!next[key]) next[key] = [];
          next[key].push({ id: r.id, from: r.start_time.slice(0, 5), to: r.end_time.slice(0, 5), locationId: r.location_id || locations[0].id });
        }
        setSchedule(next);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingShifts(false));
  }

  useEffect(() => {
    loadMonth(year, month0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArtistId, locations, year, month0]);

  function goToMonth(y: number, m0: number) {
    setYear(y);
    setMonth0(m0);
  }

  function addSlot(date: string) {
    setSchedule((prev) => {
      const existing = prev[date] || [];
      const lastLocation = existing[existing.length - 1]?.locationId || locations[0]?.id || '';
      return { ...prev, [date]: [...existing, { id: crypto.randomUUID(), from: '09:00', to: '18:00', locationId: lastLocation }] };
    });
  }

  function updateSlot(date: string, id: string, field: 'from' | 'to' | 'locationId', value: string) {
    setSchedule((prev) => ({ ...prev, [date]: (prev[date] || []).map((s) => (s.id === id ? { ...s, [field]: value } : s)) }));
  }

  function removeSlot(date: string, id: string) {
    setSchedule((prev) => ({ ...prev, [date]: (prev[date] || []).filter((s) => s.id !== id) }));
  }

  // "Monat leeren": nur der lokale Entwurf wird geleert -- wirksam erst nach "Speichern"
  // (genau wie beim Löschen eines Teammitglieds unter Locations).
  function clearMonth() {
    if (!window.confirm(`Wirklich den kompletten Monatsplan für ${MONTH_LABELS[month0]} ${year} leeren? Das gilt erst nach dem Speichern.`)) return;
    setSchedule(emptySchedule(year, month0));
    setCopiedFrom(null);
  }

  // "Monat kopieren": für jeden Wochentag wird dessen LETZTES Vorkommen im aktuellen Monat als
  // Vorlage genommen und auf jedes Vorkommen dieses Wochentags im Folgemonat übertragen. Wie bei
  // "leeren" nur ein lokaler Entwurf -- erst "Speichern" im Folgemonat schreibt es in die DB.
  function copyToNextMonth() {
    const templateByWeekday: Record<number, Slot[]> = {};
    for (const d of daysOf(year, month0)) {
      const slots = schedule[d.date] || [];
      if (slots.length > 0) templateByWeekday[d.weekday] = slots;
    }
    const target = addMonths(year, month0, 1);
    const targetSchedule = emptySchedule(target.year, target.month0);
    for (const d of daysOf(target.year, target.month0)) {
      const template = templateByWeekday[d.weekday];
      if (template) {
        targetSchedule[d.date] = template.map((s) => ({ ...s, id: crypto.randomUUID() }));
      }
    }
    const sourceLabel = `${MONTH_LABELS[month0]} ${year}`;
    goToMonth(target.year, target.month0);
    setSchedule(targetSchedule);
    setCopiedFrom(sourceLabel);
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!selectedArtistId || locations.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const { start, end } = monthBounds(year, month0);
      const entries = Object.entries(schedule).flatMap(([date, slots]) =>
        slots.map((s) => ({ date, locationId: s.locationId, start_time: s.from, end_time: s.to }))
      );
      await replaceArtistShiftDaysForMonth(selectedArtistId, start, end, entries);
      setSaved(true);
      setCopiedFrom(null);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;

  const days = daysOf(year, month0);
  const filledDaysCount = days.filter((d) => (schedule[d.date] || []).length > 0).length;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Schichtplan · Arbeitszeiten</h1>

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Artist
          </div>
          <select value={selectedArtistId} onChange={(e) => setSelectedArtistId(e.target.value)} style={selectStyle} disabled={activeArtists.length === 0}>
            {activeArtists.length === 0 && <option value="">Kein aktiver Artist erfasst</option>}
            {activeArtists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Monat
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '7px 12px' }}
              onClick={() => {
                const p = addMonths(year, month0, -1);
                goToMonth(p.year, p.month0);
              }}
            >
              ‹
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>
              {MONTH_LABELS[month0]} {year}
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '7px 12px' }}
              onClick={() => {
                const n = addMonths(year, month0, 1);
                goToMonth(n.year, n.month0);
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {locations.length === 0 && <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Zuerst unter Admin → Locations eine Location anlegen.</div>}
      {locations.length > 0 && activeArtists.length === 0 && (
        <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Noch kein aktiver Artist erfasst (Admin → Artists).</div>
      )}

      {selectedArtistId && locations.length > 0 && (
        <>
          {copiedFrom && (
            <div style={{ fontSize: 12, color: 'var(--color-accent)', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-accent)', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
              Kopie von {copiedFrom} — noch nicht gespeichert. Bitte prüfen, ggf. einzelne Tage korrigieren und dann speichern.
            </div>
          )}

          {loadingShifts ? (
            <div style={{ fontSize: 13, color: '#999' }}>Lädt bestehenden Plan…</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Monatsplan</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    Jeder Tag kann einzeln bearbeitet werden — mehrere Zeitfenster pro Tag möglich, jedes mit eigener Location. So lassen sich auch einzelne Tage nachträglich korrigieren, ohne den Rest des Monats zu verändern.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 14 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() =>
                      downloadMonthPdf({
                        artistName: activeArtists.find((a) => a.id === selectedArtistId)?.name || '',
                        monthLabel: `${MONTH_LABELS[month0]} ${year}`,
                        days,
                        schedule,
                        locationNameById: Object.fromEntries(locations.map((l) => [l.id, l.name])),
                      })
                    }
                  >
                    PDF herunterladen
                  </button>
                  <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={copyToNextMonth}>
                    In {MONTH_LABELS[addMonths(year, month0, 1).month0]} {addMonths(year, month0, 1).year} kopieren →
                  </button>
                  <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={clearMonth} disabled={filledDaysCount === 0}>
                    Monat leeren
                  </button>
                </div>
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginTop: 12, marginBottom: 24, background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {days.map((d) => (
                    <div
                      key={d.date}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '84px 1fr',
                        gap: 12,
                        alignItems: 'flex-start',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        padding: '10px 12px',
                        background: d.weekday === 5 || d.weekday === 6 ? 'rgba(0,0,0,0.02)' : 'transparent',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: (schedule[d.date] || []).length === 0 ? '#999' : '#111', paddingTop: 6 }}>
                        {WEEKDAY_LABELS[d.weekday]} {d.day}.
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {(schedule[d.date] || []).length === 0 && <div style={{ fontSize: 12, color: '#ccc', paddingTop: 6 }}>frei</div>}
                        {(schedule[d.date] || []).map((slot) => (
                          <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, background: '#fff' }}>
                            <input
                              type="time"
                              value={slot.from}
                              onChange={(e) => updateSlot(d.date, slot.id, 'from', e.target.value)}
                              style={{ border: 'none', fontSize: 12, width: 72, fontFamily: 'var(--font-body)' }}
                            />
                            <div>–</div>
                            <input
                              type="time"
                              value={slot.to}
                              onChange={(e) => updateSlot(d.date, slot.id, 'to', e.target.value)}
                              style={{ border: 'none', fontSize: 12, width: 72, fontFamily: 'var(--font-body)' }}
                            />
                            <select
                              value={slot.locationId}
                              onChange={(e) => updateSlot(d.date, slot.id, 'locationId', e.target.value)}
                              style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '3px 6px', fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--color-accent)', fontWeight: 600 }}
                            >
                              {locations.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                            <div onClick={() => removeSlot(d.date, slot.id)} style={{ color: '#999', marginLeft: 2, cursor: 'pointer' }}>
                              ✕
                            </div>
                          </div>
                        ))}
                        <div onClick={() => addSlot(d.date)} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                          + Zeitfenster
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}
              {saved && <div style={{ fontSize: 12, color: '#1a7a3f', marginBottom: 12 }}>✓ Monatsplan gespeichert.</div>}

              <button className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
                {saving ? 'Speichert…' : `${MONTH_LABELS[month0]} speichern`}
              </button>
              <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
                Ersetzt den bisherigen Plan dieses Artists für {MONTH_LABELS[month0]} {year} (alle Locations) durch die obige Ansicht.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
