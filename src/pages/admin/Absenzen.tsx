import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { fetchAbsences, createAbsence, updateAbsence, deleteAbsence, fetchArtists, type Artist } from '../../lib/queries';

type AbsenceType = 'ferien' | 'krank' | 'abwesend';
type AbsenceTabFilter = 'alle' | AbsenceType;

const TABS: { key: AbsenceType; label: string }[] = [
  { key: 'ferien', label: 'Ferien' },
  { key: 'krank', label: 'Krank' },
  { key: 'abwesend', label: 'Abwesend' },
];

const FILTER_TABS: { key: AbsenceTabFilter; label: string }[] = [{ key: 'alle', label: 'Alle' }, ...TABS];

const inputStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' };

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// ---------- Absenz erstellen / bearbeiten ----------
function AbsenceModal({
  absence,
  artists,
  onClose,
  onSaved,
}: {
  absence: any | null; // null = neu anlegen
  artists: Artist[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = absence === null;
  const [artistId, setArtistId] = useState(absence?.artist_id || artists[0]?.id || '');
  const [type, setType] = useState<AbsenceType>(absence?.type || 'ferien');
  const [dateFrom, setDateFrom] = useState(absence?.start_date || new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(absence?.end_date || new Date().toISOString().slice(0, 10));
  const [halfDay, setHalfDay] = useState(absence?.half_day && absence.half_day !== 'none');
  const [halfDayPeriod, setHalfDayPeriod] = useState<'vormittag' | 'nachmittag'>(absence?.half_day === 'pm' ? 'nachmittag' : 'vormittag');
  const [notes, setNotes] = useState(absence?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const artistValid = !!artistId;
  const dateRangeValid = dateFrom && dateTo && dateFrom <= dateTo;
  const canSave = artistValid && dateRangeValid;

  async function handleSave() {
    setAttempted(true);
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        artist_id: artistId,
        type,
        start_date: dateFrom,
        end_date: dateTo,
        half_day: (halfDay ? (halfDayPeriod === 'vormittag' ? 'am' : 'pm') : 'none') as 'none' | 'am' | 'pm',
        notes: notes.trim() || null,
      };
      if (isNew) {
        await createAbsence(payload);
      } else {
        await updateAbsence(absence.id, payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAbsence(absence.id);
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  }

  return (
    <Modal title={isNew ? 'Neue Absenz' : 'Absenz bearbeiten'} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Artist
        </div>
        <select value={artistId} onChange={(e) => setArtistId(e.target.value)} style={attempted && !artistValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle}>
          <option value="">Bitte wählen…</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {attempted && !artistValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginTop: 4 }}>Bitte einen Artist auswählen.</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Art der Absenz
        </div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)} style={{ flex: 1, textAlign: 'center', padding: 8, background: type === t.key ? '#111' : 'transparent', color: type === t.key ? '#fff' : '#777', border: 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum von
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={attempted && !dateRangeValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label-uppercase" style={{ marginBottom: 4 }}>
            Datum bis
          </div>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={attempted && !dateRangeValid ? { ...inputStyle, border: '1px solid var(--color-destructive)' } : inputStyle} />
        </div>
      </div>
      {attempted && !dateRangeValid && <div style={{ fontSize: 11, color: 'var(--color-destructive)', marginBottom: 10 }}>"Bis"-Datum darf nicht vor "Von"-Datum liegen.</div>}

      <div style={{ marginBottom: 20, marginTop: 10 }}>
        <div className="label-uppercase" style={{ marginBottom: 6 }}>
          Dauer
        </div>
        <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12, marginBottom: 8 }}>
          <button onClick={() => setHalfDay(false)} style={{ flex: 1, padding: 8, background: !halfDay ? '#111' : 'transparent', color: !halfDay ? '#fff' : '#777', border: 'none' }}>
            Ganzer Tag
          </button>
          <button onClick={() => setHalfDay(true)} style={{ flex: 1, padding: 8, background: halfDay ? '#111' : 'transparent', color: halfDay ? '#fff' : '#777', border: 'none' }}>
            Halber Tag
          </button>
        </div>
        {halfDay && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: halfDayPeriod === 'vormittag' ? 600 : 400 }}>Vormittag</div>
            <div
              onClick={() => setHalfDayPeriod((p) => (p === 'vormittag' ? 'nachmittag' : 'vormittag'))}
              style={{ width: 42, height: 24, background: 'var(--color-accent)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  background: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 3,
                  left: halfDayPeriod === 'vormittag' ? 3 : 21,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                  transition: 'left 0.15s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: halfDayPeriod === 'nachmittag' ? '#111' : '#999', fontWeight: halfDayPeriod === 'nachmittag' ? 600 : 400 }}>Nachmittag</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Notiz (optional)
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: 44 }} placeholder="z.B. Grund der Absenz…" />
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: isNew ? 0 : 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Speichert…' : isNew ? 'Absenz speichern' : 'Speichern'}
        </button>
      </div>

      {!isNew &&
        (!confirmDelete ? (
          <button className="btn btn-destructive" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDelete(true)}>
            Absenz löschen
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDelete(false)}>
              Doch nicht
            </button>
            <button
              className="btn btn-destructive"
              style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff', opacity: deleting ? 0.6 : 1 }}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Löscht…' : 'Wirklich löschen'}
            </button>
          </div>
        ))}
    </Modal>
  );
}

export default function Absenzen() {
  const [tab, setTab] = useState<AbsenceTabFilter>('alle');
  const [artistFilter, setArtistFilter] = useState('alle');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [absences, setAbsences] = useState<any[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([fetchAbsences(), fetchArtists()])
      .then(([a, ar]) => {
        setAbsences(a);
        setArtists(ar);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const filtered = useMemo(() => {
    return absences.filter((a) => {
      if (tab !== 'alle' && a.type !== tab) return false;
      if (artistFilter !== 'alle' && a.artist_id !== artistFilter) return false;
      return true;
    });
  }, [absences, tab, artistFilter]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Absenzen</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Neue Absenz
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 18px',
                borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? '#111' : '#777',
                background: 'none',
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)} style={{ border: '1px solid var(--color-border)', padding: '7px 10px', fontSize: 12, borderRadius: 4 }}>
          <option value="alle">Alle Artists</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

      {!loading && !error && (
        <>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1.3fr 40px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
            <div>Artist</div>
            <div>Von</div>
            <div>Bis</div>
            <div>Dauer</div>
            <div>Notiz</div>
            <div />
          </div>

          {filtered.map((a) => (
            <div
              key={a.id}
              onClick={() => setEditing(a)}
              onMouseEnter={() => setHoveredRow(a.id)}
              onMouseLeave={() => setHoveredRow(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditing(a);
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1.3fr 40px',
                padding: '14px 12px',
                fontSize: 13,
                borderBottom: '1px solid #eee',
                alignItems: 'center',
                cursor: 'pointer',
                background: hoveredRow === a.id ? '#fbfaf8' : 'transparent',
                outline: 'none',
              }}
            >
              <div>{a.artists?.name || '—'}</div>
              <div>{new Date(a.start_date).toLocaleDateString('de-CH')}</div>
              <div>{new Date(a.end_date).toLocaleDateString('de-CH')}</div>
              <div>{a.half_day === 'none' ? 'Ganzer Tag' : a.half_day === 'am' ? 'Halber Tag (Vorm.)' : 'Halber Tag (Nachm.)'}</div>
              <div style={{ color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes || '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', color: hoveredRow === a.id ? 'var(--color-accent)' : '#ccc' }}>
                <EditIcon />
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '24px 12px', fontSize: 13, color: '#999' }}>Keine Einträge in dieser Kategorie.</div>}
          </div>
          {filtered.length > 0 && <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Klick auf eine Zeile öffnet die Bearbeitung.</div>}
        </>
      )}

      {showNew && (
        <AbsenceModal
          absence={null}
          artists={artists}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            reload();
          }}
        />
      )}
      {editing && (
        <AbsenceModal
          absence={editing}
          artists={artists}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
