import { useEffect, useState } from 'react';
import { useLocationContext } from '../../lib/locationContext';
import {
  fetchCustomerStatsForMonth,
  fetchServiceProductPerformance,
  fetchMonthlyRevenueSeries,
  fetchYearlyRevenueSeries,
  type CustomerStats,
  type ServiceProductPerformance,
  type RevenuePoint,
} from '../../lib/queries';
import { formatCHF } from '../../lib/format';

function BarChart({ data }: { data: RevenuePoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', padding: '20px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 20 ? 3 : 10, height: 220 }}>
        {data.map((d, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'default' }}
          >
            {hovered === i && (
              <div
                style={{
                  position: 'absolute',
                  bottom: `${Math.max(4, (d.total / max) * 180) + 8}px`,
                  background: 'var(--color-primary)',
                  color: 'var(--color-surface)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}
              >
                {formatCHF(d.total)}
              </div>
            )}
            <div
              style={{
                width: '100%',
                maxWidth: 36,
                height: `${Math.max(2, (d.total / max) * 180)}px`,
                background: hovered === i ? 'var(--color-primary)' : 'var(--color-accent)',
                borderRadius: '3px 3px 0 0',
                transition: 'background 0.15s ease',
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6, whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function useScopedLocation() {
  const { locations, locationsLoaded, isLocationLocked, accountLocationId } = useLocationContext();
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    if (!locationsLoaded) return;
    if (isLocationLocked && accountLocationId) {
      setLocationId(accountLocationId);
    } else if (locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsLoaded, isLocationLocked, accountLocationId, locations]);

  return { locations, locationId, setLocationId, isLocationLocked };
}

function LocationPicker({
  locations,
  locationId,
  setLocationId,
  isLocationLocked,
}: {
  locations: { id: string; name: string }[];
  locationId: string;
  setLocationId: (id: string) => void;
  isLocationLocked: boolean;
}) {
  const currentLocationName = locations.find((l) => l.id === locationId)?.name || '—';
  return isLocationLocked ? (
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
  );
}

function KundenStatistik() {
  const { locations, locationId, setLocationId, isLocationLocked } = useScopedLocation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
        <LocationPicker locations={locations} locationId={locationId} setLocationId={setLocationId} isLocationLocked={isLocationLocked} />
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

function PerformanceTable({ title, rows, total }: { title: string; rows: { id: string; name: string; qty: number; revenue: number }[]; total: number }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px', padding: '12px 14px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
          <div>{title}</div>
          <div />
          <div style={{ textAlign: 'right' }}>{formatCHF(total)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px', padding: '8px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
          <div>Name</div>
          <div>Menge</div>
          <div style={{ textAlign: 'right' }}>Umsatz</div>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Keine Verkäufe in diesem Zeitraum.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px', padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}>
              <div>{r.name}</div>
              <div>{r.qty}</div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCHF(r.revenue)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PerformanceStatistik() {
  const { locations, locationId, setLocationId, isLocationLocked } = useScopedLocation();
  const [period, setPeriod] = useState<'monat' | 'jahr'>('monat');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [perf, setPerf] = useState<ServiceProductPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    const start = period === 'monat' ? `${year}-${String(month + 1).padStart(2, '0')}-01` : `${year}-01-01`;
    const end =
      period === 'monat'
        ? `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`
        : `${year}-12-31`;
    fetchServiceProductPerformance(locationId, start, end)
      .then(setPerf)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [locationId, period, year, month]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['monat', 'jahr'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{ padding: '8px 16px', background: period === p ? '#111' : 'transparent', color: period === p ? '#fff' : '#555', border: 'none', textTransform: 'capitalize', cursor: 'pointer' }}
            >
              {p}
            </button>
          ))}
        </div>
        <LocationPicker locations={locations} locationId={locationId} setLocationId={setLocationId} isLocationLocked={isLocationLocked} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
        {period === 'monat' ? (
          <>
            <button onClick={() => shiftMonth(-1)} style={navBtnStyle}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button onClick={() => shiftMonth(1)} style={navBtnStyle}>›</button>
          </>
        ) : (
          <>
            <button onClick={() => setYear((y) => y - 1)} style={navBtnStyle}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 100, textAlign: 'center' }}>{year}</div>
            <button onClick={() => setYear((y) => y + 1)} style={navBtnStyle}>›</button>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : perf ? (
        <>
          <PerformanceTable title="Dienstleistungen" rows={perf.services} total={perf.serviceTotal} />
          <PerformanceTable title="Produkte" rows={perf.products} total={perf.productTotal} />
        </>
      ) : null}
    </div>
  );
}

function UmsatzStatistik() {
  const { locations, locationId, setLocationId, isLocationLocked } = useScopedLocation();
  const [monthly, setMonthly] = useState<RevenuePoint[] | null>(null);
  const [yearly, setYearly] = useState<RevenuePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchMonthlyRevenueSeries(locationId, 12), fetchYearlyRevenueSeries(locationId, 5)])
      .then(([m, y]) => {
        setMonthly(m);
        setYearly(y);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [locationId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
        <LocationPicker locations={locations} locationId={locationId} setLocationId={setLocationId} isLocationLocked={isLocationLocked} />
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Umsatz pro Monat (letzte 12 Monate)</div>
          {monthly && <BarChart data={monthly} />}

          <div style={{ fontSize: 13, fontWeight: 700, margin: '28px 0 10px' }}>Umsatz pro Jahr (letzte 5 Jahre)</div>
          {yearly && <BarChart data={yearly} />}
        </>
      )}
    </div>
  );
}

export default function Statistiken() {
  const [tab, setTab] = useState<'kunden' | 'performance' | 'umsatz'>('kunden');

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Statistiken</h1>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, fontSize: 13 }}>
        {(['kunden', 'performance', 'umsatz'] as const).map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 18px',
              borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#111' : '#777',
              cursor: 'pointer',
            }}
          >
            {t === 'kunden' ? 'Kunden' : t === 'performance' ? 'Dienstleistungen & Produkte' : 'Umsatzverlauf'}
          </div>
        ))}
      </div>

      {tab === 'kunden' ? <KundenStatistik /> : tab === 'performance' ? <PerformanceStatistik /> : <UmsatzStatistik />}
    </div>
  );
}
