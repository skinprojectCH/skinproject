import { useEffect, useState } from 'react';
import { useLocationContext } from '../../lib/locationContext';
import { fetchCustomerStatsForMonth, type CustomerStats } from '../../lib/queries';
import { formatCHF } from '../../lib/format';

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const navBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 15,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontSize: 15,
  cursor: 'pointer',
};

const kpiCardStyle: React.CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 6, padding: 16, flex: 1 };

export default function Statistiken() {
  const { locations, locationsLoaded, isLocationLocked, accountLocationId } = useLocationContext();
  const [locationId, setLocationId] = useState('');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationsLoaded) return;
    if (isLocationLocked && accountLocationId) {
      setLocationId(accountLocationId);
    } else if (locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsLoaded, isLocationLocked, accountLocationId, locations]);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    fetchCustomerStatsForMonth(locationId, year, month)
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [locationId, year, month]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const currentLocationName = locations.find((l) => l.id === locationId)?.name || '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24 }}>Statistiken · Kunden</h1>

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => shiftMonth(-1)} style={navBtnStyle}>‹</button>
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <button onClick={() => shiftMonth(1)} style={navBtnStyle}>›</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : stats ? (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Gesamt</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{stats.totalCustomers}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Neue Kunden</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>+{stats.newCustomers}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Wiederkehrende Kunden</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{stats.returningCustomers}</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 90px 110px 110px 90px', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
              <div>Kundenname</div>
              <div>Besuche</div>
              <div>Ø Betrag</div>
              <div>Total</div>
              <div />
            </div>
            {stats.rows.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Keine Kunden mit Umsatz in diesem Monat.</div>
            ) : (
              stats.rows.map((row) => (
                <div
                  key={row.customerId}
                  style={{ display: 'grid', gridTemplateColumns: '1.6fr 90px 110px 110px 90px', padding: '14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}
                >
                  <div>{row.name}</div>
                  <div>{row.visits}</div>
                  <div>{formatCHF(row.avg)}</div>
                  <div style={{ fontWeight: 600 }}>{formatCHF(row.total)}</div>
                  <div>
                    {row.isNew && (
                      <span style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: 10, padding: '2px 10px', fontSize: 10, fontWeight: 600 }}>neu</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
