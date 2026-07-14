import { useEffect, useState } from 'react';
import { fetchLocations, fetchArtists, fetchAllShiftsForArtist, replaceArtistShifts, type Location, type Artist } from '../../lib/queries';

interface Slot {
  id: string;
  from: string;
  to: string;
  locationId: string;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']; // Index 0 = Montag, passend zu shifts.weekday

function emptySchedule(): Record<number, Slot[]> {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

const selectStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-body)' };

export default function Schichtplan() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [schedule, setSchedule] = useState<Record<number, Slot[]>>(emptySchedule());
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState('');
  const [unbefristet, setUnbefristet] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasExistingShifts, setHasExistingShifts] = useState(false);

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
      setSchedule(emptySchedule());
      setHasExistingShifts(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArtists.length]);

  useEffect(() => {
    if (!selectedArtistId || locations.length === 0) return;
    setLoadingShifts(true);
    setSaved(false);
    setSaveError(null);
    fetchAllShiftsForArtist(selectedArtistId)
      .then((shifts) => {
        setHasExistingShifts(shifts.length > 0);
        const next = emptySchedule();
        for (const s of shifts) {
          next[s.weekday] = [...(next[s.weekday] || []), { id: s.id, from: s.start_time.slice(0, 5), to: s.end_time.slice(0, 5), locationId: s.location_id || locations[0].id }];
        }
        setSchedule(next);
        if (shifts.length > 0) {
          setValidFrom(shifts[0].valid_from);
          setValidTo(shifts[0].valid_to || '');
          setUnbefristet(!shifts[0].valid_to);
        } else {
          setValidFrom(new Date().toISOString().slice(0, 10));
          setValidTo('');
          setUnbefristet(true);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingShifts(false));
  }, [selectedArtistId, locations]);

  function addSlot(weekday: number) {
    setSchedule((prev) => {
      const lastLocation = prev[weekday][prev[weekday].length - 1]?.locationId || locations[0]?.id || '';
      return { ...prev, [weekday]: [...prev[weekday], { id: crypto.randomUUID(), from: '09:00', to: '18:00', locationId: lastLocation }] };
    });
  }

  function updateSlot(weekday: number, id: string, field: 'from' | 'to' | 'locationId', value: string) {
    setSchedule((prev) => ({ ...prev, [weekday]: prev[weekday].map((s) => (s.id === id ? { ...s, [field]: value } : s)) }));
  }

  function removeSlot(weekday: number, id: string) {
    setSchedule((prev) => ({ ...prev, [weekday]: prev[weekday].filter((s) => s.id !== id) }));
  }

  async function handleApply() {
    if (!selectedArtistId || locations.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const allSlots = WEEKDAYS.flatMap((_, weekday) => schedule[weekday].map((s) => ({ ...s, weekday })));
      // Pro Location speichern (auch für Locations ohne Zeitfenster in diesem Speichervorgang —
      // sonst würden entfernte Zeitfenster an dieser Location nicht gelöscht).
      await Promise.all(
        locations.map((loc) => {
          const slotsHere = allSlots.filter((s) => s.locationId === loc.id).map((s) => ({ weekday: s.weekday, start_time: s.from, end_time: s.to }));
          return replaceArtistShifts(selectedArtistId, loc.id, validFrom, unbefristet ? null : validTo || null, slotsHere);
        })
      );
      setSaved(true);
      setHasExistingShifts(allSlots.length > 0);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (error) return <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>;

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
      </div>

      {locations.length === 0 && <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Zuerst unter Admin → Locations eine Location anlegen.</div>}
      {locations.length > 0 && activeArtists.length === 0 && (
        <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>Noch kein aktiver Artist erfasst (Admin → Artists).</div>
      )}

      {selectedArtistId && locations.length > 0 && (
        <>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Gültig von
              </div>
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} style={selectStyle} />
            </div>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Gültig bis
              </div>
              <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} style={{ ...selectStyle, opacity: unbefristet ? 0.4 : 1 }} disabled={unbefristet} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', paddingBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={unbefristet} onChange={(e) => setUnbefristet(e.target.checked)} />
              Unbefristet
            </label>
          </div>

          {loadingShifts ? (
            <div style={{ fontSize: 13, color: '#999' }}>Lädt bestehenden Plan…</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Wochenplan</div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
                Pro Tag können mehrere Zeitfenster erfasst werden, jedes mit eigener Location — so lässt sich die ganze Woche für diesen Artist auf einen Blick eintragen, z.B. Mo bei Salon A, Di bei Salon B.
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 24, background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {WEEKDAYS.map((day, weekday) => (
                    <div
                      key={day}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr',
                        gap: 12,
                        alignItems: 'flex-start',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: schedule[weekday].length === 0 ? '#999' : '#111', paddingTop: 6 }}>{day}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {schedule[weekday].length === 0 && <div style={{ fontSize: 12, color: '#ccc', paddingTop: 6 }}>frei</div>}
                        {schedule[weekday].map((slot) => (
                          <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, background: '#fff' }}>
                            <input
                              type="time"
                              value={slot.from}
                              onChange={(e) => updateSlot(weekday, slot.id, 'from', e.target.value)}
                              style={{ border: 'none', fontSize: 12, width: 72, fontFamily: 'var(--font-body)' }}
                            />
                            <div>–</div>
                            <input
                              type="time"
                              value={slot.to}
                              onChange={(e) => updateSlot(weekday, slot.id, 'to', e.target.value)}
                              style={{ border: 'none', fontSize: 12, width: 72, fontFamily: 'var(--font-body)' }}
                            />
                            <select
                              value={slot.locationId}
                              onChange={(e) => updateSlot(weekday, slot.id, 'locationId', e.target.value)}
                              style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '3px 6px', fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--color-accent)', fontWeight: 600 }}
                            >
                              {locations.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                            <div onClick={() => removeSlot(weekday, slot.id)} style={{ color: '#999', marginLeft: 2, cursor: 'pointer' }}>
                              ✕
                            </div>
                          </div>
                        ))}
                        <div onClick={() => addSlot(weekday)} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                          + Zeitfenster
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {saveError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{saveError}</div>}
              {saved && <div style={{ fontSize: 12, color: '#1a7a3f', marginBottom: 12 }}>✓ Wochenplan übernommen.</div>}

              <button className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleApply}>
                {saving ? 'Übernimmt…' : 'Wochenplan übernehmen'}
              </button>
              {hasExistingShifts && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Ersetzt den bisherigen Wochenplan dieses Artists an allen Locations durch die obige Ansicht.</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
