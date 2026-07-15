import { useEffect, useState } from 'react';
import { fetchVouchers, fetchCustomers, type Voucher, type Customer } from '../../lib/queries';

export default function Gutscheine() {
  const [filter, setFilter] = useState<'alle' | 'aktiv' | 'eingelöst'>('aktiv');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchVouchers(), fetchCustomers()])
      .then(([v, c]) => {
        setVouchers(v);
        setCustomers(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = vouchers.filter((v) => filter === 'alle' || v.status === filter);
  const totalSold = vouchers.reduce((sum, v) => sum + v.value, 0);
  const openRemaining = vouchers.reduce((sum, v) => sum + v.remaining_value, 0);
  const activeCount = vouchers.filter((v) => v.status === 'aktiv').length;

  const KPIS = [
    { label: 'Verkauft (Total)', value: `CHF ${totalSold.toLocaleString('de-CH')}` },
    { label: 'Offener Restwert', value: `CHF ${openRemaining.toLocaleString('de-CH')}` },
    { label: 'Aktive Gutscheine', value: String(activeCount) },
    { label: 'Eingelöst diesen Monat', value: '—' },
  ];

  function buyerName(id: string | null) {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? `${c.vorname} ${c.name}` : '—';
  }

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 24 }}>Gutscheine</h1>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          Reine Übersicht — neue Gutscheine werden über "+ Gutschein verkaufen" in der Kasse ausgestellt (echter Verkauf mit Zahlung).
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, marginTop: 20 }}>
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['alle', 'aktiv', 'eingelöst'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 14px', background: filter === f ? '#111' : 'transparent', color: filter === f ? '#fff' : '#555', border: 'none', textTransform: 'capitalize', cursor: 'pointer' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', borderRadius: 6, padding: 16 }}>
            <div className="label-uppercase" style={{ marginBottom: 8 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--color-destructive)' }}>Fehler: {error}</div>}

      {!loading && !error && (
        <>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 90px 100px 90px', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
            <div>Code</div>
            <div>Käufer</div>
            <div>Verkaufswert</div>
            <div>Restwert</div>
            <div>Verkauft am</div>
            <div>Status</div>
          </div>

          {filtered.map((v) => (
            <div
              key={v.id}
              style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 90px 100px 90px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', color: v.status === 'eingelöst' ? '#999' : '#111' }}
            >
              <div style={{ fontFamily: 'monospace' }}>{v.code}</div>
              <div>{buyerName(v.buyer_customer_id)}</div>
              <div>CHF {v.value}</div>
              <div>CHF {v.remaining_value}</div>
              <div>{new Date(v.created_at).toLocaleDateString('de-CH')}</div>
              <div
                style={{
                  border: `1px solid ${v.status === 'aktiv' ? 'var(--color-accent)' : '#ddd'}`,
                  color: v.status === 'aktiv' ? 'var(--color-accent)' : '#999',
                  borderRadius: 10,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                {v.status}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Noch keine Gutscheine verkauft.</div>}
          </div>
        </>
      )}
    </div>
  );
}
