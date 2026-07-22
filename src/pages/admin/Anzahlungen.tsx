import { useEffect, useState } from 'react';
import { fetchAnzahlungen, fetchCustomers, type Voucher, type Customer } from '../../lib/queries';
import { formatCHF } from '../../lib/format';

export default function Anzahlungen() {
  const [filter, setFilter] = useState<'alle' | 'aktiv' | 'eingelöst'>('aktiv');
  const [anzahlungen, setAnzahlungen] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAnzahlungen(), fetchCustomers()])
      .then(([a, c]) => {
        setAnzahlungen(a);
        setCustomers(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = anzahlungen.filter((v) => filter === 'alle' || v.status === filter);
  const totalSold = anzahlungen.reduce((sum, v) => sum + v.value, 0);
  const openRemaining = anzahlungen.reduce((sum, v) => sum + v.remaining_value, 0);
  const activeCount = anzahlungen.filter((v) => v.status === 'aktiv').length;

  const KPIS = [
    { label: 'Erfasst (Total)', value: formatCHF(totalSold) },
    { label: 'Offenes Guthaben', value: formatCHF(openRemaining) },
    { label: 'Aktive Anzahlungen', value: String(activeCount) },
  ];

  function buyerName(v: Voucher) {
    if (v.buyer_customer_id) {
      const c = customers.find((c) => c.id === v.buyer_customer_id);
      if (c) return `${c.vorname} ${c.name}`;
    }
    return v.buyer_name || '—';
  }

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 24 }}>Anzahlungen</h1>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          Reine Übersicht — Kunden-Guthaben, die über "+ Anzahlung" in der Kasse erfasst wurden. Zählt beim Erfassen bewusst nicht als Umsatz, erst wenn als Zahlungsart eingesetzt.
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
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
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 100px 90px', gap: 10, padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
            <div>Kunde</div>
            <div>Verkauft am</div>
            <div>Wert</div>
            <div>Restwert</div>
            <div>Status</div>
          </div>

          {filtered.map((v) => (
            <div
              key={v.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 100px 90px', gap: 10, padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #eee', alignItems: 'center', color: v.status === 'eingelöst' ? '#999' : '#111' }}
            >
              <div>
                {buyerName(v)}
                <div style={{ fontSize: 10, color: '#bbb', fontFamily: 'monospace', marginTop: 2 }}>{v.code}</div>
              </div>
              <div>{new Date(v.created_at).toLocaleDateString('de-CH')}</div>
              <div>{formatCHF(v.value)}</div>
              <div>{formatCHF(v.remaining_value)}</div>
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
          {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Noch keine Anzahlungen erfasst.</div>}
        </div>
      )}
    </div>
  );
}
