import { useEffect, useRef, useState } from 'react';
import { isNoMoneyIn } from '../../lib/paymentMethods';
import { useLocationContext } from '../../lib/locationContext';
import {
  fetchCustomerStatsForMonth,
  fetchServiceProductPerformance,
  fetchMonthlyRevenueSeriesMulti,
  fetchYearlyRevenueSeriesMulti,
  fetchMonthlyArtistRevenueSeriesMulti,
  fetchYearlyArtistRevenueSeriesMulti,
  fetchArtists,
  fetchDiscountStats,
  fetchPaymentMethodStats,
  fetchDailySales,
  type DailySaleRow,
  type PaymentMethodStats,
  type CustomerStats,
  type ServiceProductPerformance,
  type DiscountStats,
} from '../../lib/queries';
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

const LOCATION_COLORS = ['var(--color-accent)', 'var(--color-slate)', 'var(--color-destructive)', 'var(--color-taupe)', '#5B8A72', '#7A6FB0'];

function MultiLocationBarChart({
  data,
  locations,
}: {
  data: { label: string; values: Record<string, number> }[];
  locations: { id: string; name: string; color?: string }[];
}) {
  // Eigene Farbe pro Serie (z.B. Kalenderfarbe des Artists), sonst Standardpalette.
  const colorOf = (l: { color?: string }, li: number) => l.color || LOCATION_COLORS[li % LOCATION_COLORS.length];
  const max = Math.max(1, ...data.flatMap((d) => locations.map((l) => d.values[l.id] || 0)));
  const [hovered, setHovered] = useState<{ i: number; locId: string } | null>(null);
  // Bei vielen Serien (z.B. alle Artists) wird das Diagramm breiter als das Feld ->
  // innerhalb des weissen Felds horizontal scrollen, Start ganz rechts (neuester Monat).
  const barWidth = data.length > 20 ? 5 : 12;
  const groupMinWidth = locations.length * (barWidth + 3) + 16;
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data, locations]);

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', padding: '20px 16px 12px' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        {locations.map((l, li) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: colorOf(l, li), display: 'inline-block' }} />
            {l.name}
          </div>
        ))}
      </div>
      <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 20 ? 6 : 16, height: 220, minWidth: data.length * groupMinWidth }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: groupMinWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 180, position: 'relative' }}>
              {locations.map((l, li) => {
                const val = d.values[l.id] || 0;
                const isHovered = hovered?.i === i && hovered.locId === l.id;
                return (
                  <div key={l.id} style={{ position: 'relative' }} onMouseEnter={() => setHovered({ i, locId: l.id })} onMouseLeave={() => setHovered(null)}>
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: `${Math.max(4, (val / max) * 180) + 8}px`,
                          left: '50%',
                          transform: 'translateX(-50%)',
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
                        {l.name}: {formatCHF(val)}
                      </div>
                    )}
                    <div
                      style={{
                        width: barWidth,
                        height: `${Math.max(2, (val / max) * 180)}px`,
                        background: colorOf(l, li),
                        borderRadius: '2px 2px 0 0',
                        opacity: hovered && !isHovered ? 0.5 : 1,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 6, whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function PieChart({ discountPct, size = 160 }: { discountPct: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, discountPct));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(var(--color-destructive) 0deg ${pct * 3.6}deg, var(--color-accent) ${pct * 3.6}deg 360deg)`,
        flexShrink: 0,
        boxShadow: '0 0 0 1px var(--color-border)',
      }}
    />
  );
}

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
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Laufkunden</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{stats.walkInCount}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>ohne Kundenprofil</div>
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

const DAY_PAY_LABELS: Record<string, string> = { bar: 'Bar', karte: 'Karte', twint: 'TWINT', rechnung: 'Rechnung', online: 'Online', gutschein: 'Gutschein', anzahlung: 'Anzahlung', anzahlung_alt: 'Anzahlung alte Kasse' };

function DailySalesView({ daily }: { daily: { rows: DailySaleRow[]; byMethod: Record<string, number> } }) {
  const methodOrder = ['bar', 'karte', 'twint', 'rechnung', 'online', 'gutschein', 'anzahlung', 'anzahlung_alt'];
  const methods = Object.keys(daily.byMethod).sort((a, b) => (methodOrder.indexOf(a) < 0 ? 99 : methodOrder.indexOf(a)) - (methodOrder.indexOf(b) < 0 ? 99 : methodOrder.indexOf(b)));
  for (const m of ['karte', 'bar']) if (!methods.includes(m)) methods.unshift(m);
  methods.sort((a, b) => (a === 'bar' ? -1 : b === 'bar' ? 1 : a === 'karte' ? -1 : b === 'karte' ? 1 : 0));

  const table = (title: string, kind: 'service' | 'product') => {
    const rows = daily.rows.filter((r) => r.kind === kind);
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    const cols = '60px 1fr 1fr 60px 140px 110px';
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', padding: '12px 14px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--color-border)' }}>
            <div>{title}</div>
            <div style={{ textAlign: 'right' }}>{formatCHF(total)}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '8px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
            <div>Zeit</div>
            <div>Name</div>
            <div>Kunde</div>
            <div>Menge</div>
            <div>Zahlungsart</div>
            <div style={{ textAlign: 'right' }}>Umsatz</div>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Keine Verkäufe an diesem Tag.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: cols, padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)', alignItems: 'center' }}>
                <div style={{ color: '#777' }}>{r.time}</div>
                <div>{r.name}</div>
                <div style={{ color: '#777' }}>{r.customerLabel}</div>
                <div>{r.qty}</div>
                <div>{r.methods.map((m) => DAY_PAY_LABELS[m] || m).join(' + ') || '—'}</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCHF(r.revenue)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', padding: 16, marginBottom: 24, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {methods.map((m) => (
          <div key={m}>
            <div style={{ fontSize: 12, color: '#777' }}>{DAY_PAY_LABELS[m] || m}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>{formatCHF(daily.byMethod[m] || 0)}</div>
          </div>
        ))}
      </div>
      {table('Dienstleistungen', 'service')}
      {table('Produkte', 'product')}
    </>
  );
}

function PerformanceStatistik() {
  const { locations, locationId, setLocationId, isLocationLocked } = useScopedLocation();
  const [period, setPeriod] = useState<'tag' | 'monat' | 'jahr'>('monat');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [day, setDay] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  const [daily, setDaily] = useState<{ rows: DailySaleRow[]; byMethod: Record<string, number> } | null>(null);

  const [perf, setPerf] = useState<ServiceProductPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    if (period === 'tag') {
      fetchDailySales(locationId, day)
        .then(setDaily)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }
    const start = period === 'monat' ? `${year}-${String(month + 1).padStart(2, '0')}-01` : `${year}-01-01`;
    const end =
      period === 'monat'
        ? `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`
        : `${year}-12-31`;
    fetchServiceProductPerformance(locationId, start, end)
      .then(setPerf)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [locationId, period, year, month, day]);

  function shiftDay(delta: number) {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDay(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }

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
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14 }}>Nur Salon-Anteil: Dienstleistungen mit Miet- & Serviceanteil (ohne Artist-Anteil), Produkte zu 100%.</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['tag', 'monat', 'jahr'] as const).map((p) => (
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
        {period === 'tag' ? (
          <>
            <button onClick={() => shiftDay(-1)} style={navBtnStyle}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 700, minWidth: 220, textAlign: 'center' }}>
              {new Date(`${day}T12:00:00`).toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <button onClick={() => shiftDay(1)} style={navBtnStyle}>›</button>
          </>
        ) : period === 'monat' ? (
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
      ) : period === 'tag' ? (
        daily && <DailySalesView daily={daily} />
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
  const { locations, locationsLoaded, isLocationLocked, accountLocationId } = useLocationContext();
  const [monthly, setMonthly] = useState<{ label: string; values: Record<string, number> }[] | null>(null);
  const [yearly, setYearly] = useState<{ label: string; values: Record<string, number> }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location-Manager sehen weiterhin nur ihren eigenen Standort (Datenschutz) -- der
  // Standort-Vergleich mit mehreren Farben ist nur für den Hauptadmin sinnvoll/erlaubt.
  const scopedLocations = isLocationLocked && accountLocationId ? locations.filter((l) => l.id === accountLocationId) : locations;

  useEffect(() => {
    if (!locationsLoaded || scopedLocations.length === 0) return;
    setLoading(true);
    setError(null);
    const ids = scopedLocations.map((l) => l.id);
    Promise.all([fetchMonthlyRevenueSeriesMulti(ids, 12), fetchYearlyRevenueSeriesMulti(ids, 5)])
      .then(([m, y]) => {
        setMonthly(m);
        setYearly(y);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsLoaded, scopedLocations.map((l) => l.id).join(',')]);

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Salon-Umsatz: Produkte + Miet- & Serviceanteil an Dienstleistungen (ohne Artist-Anteil, ohne Gutschein-/Anzahlungs-Verkäufe).</div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Umsatz pro Monat (letzte 12 Monate)</div>
          {monthly && <MultiLocationBarChart data={monthly} locations={scopedLocations} />}

          <div style={{ fontSize: 13, fontWeight: 700, margin: '28px 0 10px' }}>Umsatz pro Jahr (letzte 5 Jahre)</div>
          {yearly && <MultiLocationBarChart data={yearly} locations={scopedLocations} />}
        </>
      )}
    </div>
  );
}

function ArtistUmsatzStatistik() {
  const [artists, setArtists] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [monthly, setMonthly] = useState<{ label: string; values: Record<string, number> }[] | null>(null);
  const [yearly, setYearly] = useState<{ label: string; values: Record<string, number> }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchArtists()
      .then((all) => {
        const active = all.filter((a) => a.status === 'active' && !a.is_employee).map((a) => ({ id: a.id, name: a.kuenstlername || a.name, color: a.calendar_color || undefined }));
        setArtists(active);
        const ids = active.map((a) => a.id);
        return Promise.all([fetchMonthlyArtistRevenueSeriesMulti(ids, 12), fetchYearlyArtistRevenueSeriesMulti(ids, 5)]);
      })
      .then(([m, y]) => {
        setMonthly(m);
        setYearly(y);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Anteil der Artists (Dienstleistungsumsatz ohne Miet- & Serviceanteil des Salons), über alle Standorte hinweg. Mitarbeiter sind nicht enthalten.</div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : artists.length === 0 ? (
        <div style={{ fontSize: 13, color: '#999' }}>Noch keine aktiven Artists erfasst.</div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Umsatz pro Monat (letzte 12 Monate)</div>
          {monthly && <MultiLocationBarChart data={monthly} locations={artists} />}

          <div style={{ fontSize: 13, fontWeight: 700, margin: '28px 0 10px' }}>Umsatz pro Jahr (letzte 5 Jahre)</div>
          {yearly && <MultiLocationBarChart data={yearly} locations={artists} />}
        </>
      )}
    </div>
  );
}

function RabattStatistik() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [year, setYear] = useState(now.getFullYear());

  const [monthStats, setMonthStats] = useState<DiscountStats | null>(null);
  const [yearStats, setYearStats] = useState<DiscountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = monthYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setMonthYear(y);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    const monthStart = `${monthYear}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${monthYear}-${String(month + 1).padStart(2, '0')}-${String(new Date(monthYear, month + 1, 0).getDate()).padStart(2, '0')}`;
    Promise.all([fetchDiscountStats(monthStart, monthEnd), fetchDiscountStats(`${year}-01-01`, `${year}-12-31`)])
      .then(([m, y]) => {
        setMonthStats(m);
        setYearStats(y);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month, monthYear, year]);

  function StatsBlock({ title, stats, nav }: { title: string; stats: DiscountStats | null; nav: React.ReactNode }) {
    return (
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', padding: 20, flex: 1, minWidth: 300 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ marginBottom: 16 }}>{nav}</div>
        {stats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <PieChart discountPct={stats.discountPct} />
            <div style={{ fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--color-accent)', display: 'inline-block' }} />
                Umsatz: <strong>{formatCHF(stats.netRevenue)}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--color-destructive)', display: 'inline-block' }} />
                Rabatt: <strong>{formatCHF(stats.discountAmount)}</strong>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 10 }}>{stats.discountPct.toFixed(1)}%</div>
              <div style={{ color: 'var(--color-text-muted)' }}>vom Bruttoumsatz</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Salon-Anteil: gewährter Rabatt (Positions- + Bestell-Rabatt) im Verhältnis zum Salon-Bruttoumsatz (Dienstleistungen mit Miet- & Serviceanteil, Produkte zu 100%), über alle Standorte hinweg.
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <StatsBlock
            title="Monat"
            stats={monthStats}
            nav={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => shiftMonth(-1)} style={navBtnStyle}>‹</button>
                <div style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'center' }}>
                  {MONTH_NAMES[month]} {monthYear}
                </div>
                <button onClick={() => shiftMonth(1)} style={navBtnStyle}>›</button>
              </div>
            }
          />
          <StatsBlock
            title="Jahr"
            stats={yearStats}
            nav={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setYear((y) => y - 1)} style={navBtnStyle}>‹</button>
                <div style={{ fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: 'center' }}>{year}</div>
                <button onClick={() => setYear((y) => y + 1)} style={navBtnStyle}>›</button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

const PAY_LABELS: Record<string, string> = { bar: 'Bar', karte: 'Karte', twint: 'TWINT', rechnung: 'Rechnung', online: 'Online (Stripe)', gutschein: 'Gutschein eingelöst', anzahlung: 'Anzahlung eingelöst', anzahlung_alt: 'Anzahlung alte Kasse eingelöst' };
const PAY_COLORS: Record<string, string> = { bar: '#5B8A72', karte: 'var(--color-slate)', twint: '#7A6FB0', rechnung: 'var(--color-taupe)', online: 'var(--color-accent)' };

function MethodDonut({ parts, size = 160 }: { parts: { method: string; amount: number }[]; size?: number }) {
  const total = parts.reduce((s, p) => s + p.amount, 0);
  let angle = 0;
  const stops = parts
    .filter((p) => p.amount > 0)
    .map((p) => {
      const from = angle;
      angle += (p.amount / total) * 360;
      return `${PAY_COLORS[p.method] || '#bbb'} ${from}deg ${angle}deg`;
    });
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: total > 0 ? `conic-gradient(${stops.join(', ')})` : 'var(--color-bg)',
        flexShrink: 0,
        boxShadow: '0 0 0 1px var(--color-border)',
      }}
    />
  );
}

function ZahlungsartStatistik() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [year, setYear] = useState(now.getFullYear());
  const [monthStats, setMonthStats] = useState<PaymentMethodStats | null>(null);
  const [yearStats, setYearStats] = useState<PaymentMethodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = monthYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setMonthYear(y);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    const monthStart = `${monthYear}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${monthYear}-${String(month + 1).padStart(2, '0')}-${String(new Date(monthYear, month + 1, 0).getDate()).padStart(2, '0')}`;
    Promise.all([fetchPaymentMethodStats(monthStart, monthEnd), fetchPaymentMethodStats(`${year}-01-01`, `${year}-12-31`)])
      .then(([m, y]) => {
        setMonthStats(m);
        setYearStats(y);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month, monthYear, year]);

  function Block({ title, stats, nav }: { title: string; stats: PaymentMethodStats | null; nav: React.ReactNode }) {
    const moneyIn = (stats?.byMethod || []).filter((p) => !isNoMoneyIn(p.method));
    // Bar und Karte immer anzeigen, auch wenn 0.
    for (const m of ['karte', 'bar']) if (!moneyIn.some((p) => p.method === m)) moneyIn.unshift({ method: m, amount: 0, count: 0 });
    moneyIn.sort((a, b) => (a.method === 'bar' ? -1 : b.method === 'bar' ? 1 : a.method === 'karte' ? -1 : b.method === 'karte' ? 1 : 0));
    const redeemed = (stats?.byMethod || []).filter((p) => isNoMoneyIn(p.method));
    const total = stats?.moneyInTotal || 0;
    return (
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', padding: 20, flex: 1, minWidth: 300 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        <div style={{ marginBottom: 16 }}>{nav}</div>
        {stats && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <MethodDonut parts={moneyIn} />
              <div style={{ fontSize: 12, flex: 1 }}>
                {moneyIn.map((p) => (
                  <div key={p.method} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: PAY_COLORS[p.method] || '#bbb', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>
                      {PAY_LABELS[p.method] || p.method}
                      <span style={{ color: '#bbb' }}> · {p.count}×</span>
                    </span>
                    <strong>{formatCHF(p.amount)}</strong>
                    <span style={{ color: 'var(--color-text-muted)', width: 42, textAlign: 'right' }}>{total > 0 ? `${((p.amount / total) * 100).toFixed(0)}%` : '—'}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                  <span>Total Einnahmen</span>
                  <span>{formatCHF(total)}</span>
                </div>
              </div>
            </div>
            {redeemed.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12 }}>
                Zusätzlich mit Guthaben bezahlt (kein Geldeingang): {redeemed.map((p) => `${PAY_LABELS[p.method]} ${formatCHF(p.amount)}`).join(' · ')}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const monthRows = (yearStats?.byMonth || []).filter((m) => m.total > 0);

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Salon-Anteil der Einnahmen nach Zahlungsart (nach Zahlungsdatum, ohne Artist-Anteil), über alle Standorte hinweg – inkl. Gutschein- und Anzahlungs-Verkäufe.
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>
      ) : error ? (
        <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Block
              title="Monat"
              stats={monthStats}
              nav={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => shiftMonth(-1)} style={navBtnStyle}>‹</button>
                  <div style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'center' }}>
                    {MONTH_NAMES[month]} {monthYear}
                  </div>
                  <button onClick={() => shiftMonth(1)} style={navBtnStyle}>›</button>
                </div>
              }
            />
            <Block
              title="Jahr"
              stats={yearStats}
              nav={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setYear((y) => y - 1)} style={navBtnStyle}>‹</button>
                  <div style={{ fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: 'center' }}>{year}</div>
                  <button onClick={() => setYear((y) => y + 1)} style={navBtnStyle}>›</button>
                </div>
              }
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Monatsübersicht {year}</div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                <div>Monat</div>
                <div style={{ textAlign: 'right' }}>Bar</div>
                <div style={{ textAlign: 'right' }}>Karte</div>
                <div style={{ textAlign: 'right' }}>Übrige</div>
                <div style={{ textAlign: 'right' }}>Total</div>
              </div>
              {monthRows.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Keine Einnahmen in diesem Jahr.</div>
              ) : (
                monthRows.map((m) => {
                  const bar = m.byMethod.bar || 0;
                  const karte = m.byMethod.karte || 0;
                  return (
                    <div key={m.month} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--color-border-subtle, #eee)' }}>
                      <div>{MONTH_NAMES[m.month]}</div>
                      <div style={{ textAlign: 'right' }}>{formatCHF(bar)}</div>
                      <div style={{ textAlign: 'right' }}>{formatCHF(karte)}</div>
                      <div style={{ textAlign: 'right', color: '#777' }}>{formatCHF(m.total - bar - karte)}</div>
                      <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatCHF(m.total)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Statistiken() {
  const [tab, setTab] = useState<'kunden' | 'performance' | 'umsatz' | 'artists' | 'rabatt' | 'zahlungsart'>('kunden');

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Statistiken</h1>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20, fontSize: 13, flexWrap: 'wrap' }}>
        {(['kunden', 'performance', 'umsatz', 'artists', 'rabatt', 'zahlungsart'] as const).map((t) => (
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
            {t === 'kunden' ? 'Kunden' : t === 'performance' ? 'Dienstleistungen & Produkte' : t === 'umsatz' ? 'Umsatzverlauf' : t === 'artists' ? 'Artist-Umsatz' : t === 'rabatt' ? 'Rabatte' : 'Zahlungsart'}
          </div>
        ))}
      </div>

      {tab === 'kunden' ? (
        <KundenStatistik />
      ) : tab === 'performance' ? (
        <PerformanceStatistik />
      ) : tab === 'umsatz' ? (
        <UmsatzStatistik />
      ) : tab === 'artists' ? (
        <ArtistUmsatzStatistik />
      ) : tab === 'rabatt' ? (
        <RabattStatistik />
      ) : (
        <ZahlungsartStatistik />
      )}
    </div>
  );
}
