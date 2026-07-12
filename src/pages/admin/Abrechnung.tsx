import { useEffect, useState } from 'react';
import { useLocationContext } from '../../lib/locationContext';
import { fetchLocationBilling, type LocationBilling } from '../../lib/queries';
import { formatCHF } from '../../lib/format';

type Period = 'tag' | 'monat' | 'jahr';

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const navBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 15,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: 15,
  cursor: 'pointer',
};

const summaryCardStyle: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 6, padding: 16 };

export default function Abrechnung() {
  const { locations, locationsLoaded, isLocationLocked, accountLocationId } = useLocationContext();
  const [period, setPeriod] = useState<Period>('tag');
  const [locationId, setLocationId] = useState('');

  const now = new Date();
  const [day, setDay] = useState(todayISO());
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const [billing, setBilling] = useState<LocationBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Standort-Auswahl: Hauptadmin darf frei wählen, Location-Manager ist fix auf die
  // eigene Location beschränkt (unabhängig davon, welchen Standort er im Kalender
  // gerade zum Buchen ausgewählt hat -- Umsatzzahlen anderer Standorte bleiben tabu).
  useEffect(() => {
    if (!locationsLoaded) return;
    if (isLocationLocked && accountLocationId) {
      setLocationId(accountLocationId);
    } else if (locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsLoaded, isLocationLocked, accountLocationId, locations]);

  const range = (() => {
    if (period === 'tag') return { start: day, end: day };
    if (period === 'monat') {
      const start = `${year}-${pad2(month + 1)}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return { start, end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}` };
    }
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  })();

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    fetchLocationBilling(locationId, range.start, range.end)
      .then(setBilling)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, range.start, range.end]);

  const currentLocationName = locations.find((l) => l.id === locationId)?.name || '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Abrechnung</h1>

        {isLocationLocked ? (
          <div style={{ fontSize: 12, color: '#999' }}>
            Standort: <strong style={{ color: 'var(--color-primary)' }}>{currentLocationName}</strong>
          </div>
        ) : (
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-body)' }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, fontSize: 13 }}>
        {(['tag', 'monat', 'jahr'] as const).map((p) => (
          <div
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '10px 18px',
              borderBottom: period === p ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontWeight: period === p ? 700 : 400,
              color: period === p ? '#111' : '#777',
              cursor: 'pointer',
            }}
          >
            {p === 'tag' ? 'Tagesumsatz' : p === 'monat' ? 'Monatsumsatz' : 'Jahresabschluss'}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
        {period === 'tag' && (
          <>
            <button onClick={() => setDay(shiftISO(day, -1))} style={navBtnStyle}>
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>
              {new Date(day).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => setDay(shiftISO(day, 1))} style={navBtnStyle}>
              ›
            </button>
            {day !== todayISO() && (
              <div onClick={() => setDay(todayISO())} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                Heute
              </div>
            )}
          </>
        )}
        {period === 'monat' && (
          <>
            <button
              onClick={() => {
                let m = month - 1;
                let y = year;
                if (m < 0) { m = 11; y -= 1; }
                setMonth(m);
                setYear(y);
              }}
              style={navBtnStyle}
            >
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button
              onClick={() => {
                let m = month + 1;
                let y = year;
                if (m > 11) { m = 0; y += 1; }
                setMonth(m);
                setYear(y);
              }}
              style={navBtnStyle}
            >
              ›
            </button>
          </>
        )}
        {period === 'jahr' && (
          <>
            <button onClick={() => setYear((y) => y - 1)} style={navBtnStyle}>
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 100, textAlign: 'center' }}>{year}</div>
            <button onClick={() => setYear((y) => y + 1)} style={navBtnStyle}>
              ›
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : billing ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Umsatz Salon</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{formatCHF(billing.salonRevenue)}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Umsatz Artists</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{formatCHF(billing.artistRevenue)}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Termine</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{billing.orderCount}</div>
            </div>
            <div style={summaryCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Ø Bon</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{formatCHF(billing.avgOrderValue)}</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
              <div>Artist</div>
              <div>Umsatz</div>
              <div>Miet- &amp; Serviceanteil</div>
              <div>Auszahlung</div>
            </div>
            {billing.artistRows.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Keine Dienstleistungsumsätze in diesem Zeitraum.</div>
            ) : (
              billing.artistRows.map((row) => (
                <div
                  key={row.artistId}
                  style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', padding: '14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.calendarColor, display: 'inline-block', flexShrink: 0 }} />
                    {row.artistName}
                  </div>
                  <div>{formatCHF(row.revenue)}</div>
                  <div>{row.sharePct}%</div>
                  <div style={{ fontWeight: 600 }}>{formatCHF(row.payout)}</div>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
