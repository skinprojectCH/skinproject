import { useState } from 'react';
import Modal from '../../components/Modal';

interface Voucher {
  id: string;
  code: string;
  buyer: string;
  value: number;
  remaining: number;
  soldAt: string;
  status: 'aktiv' | 'eingelöst';
}

const MOCK_VOUCHERS: Voucher[] = [
  { id: 'v1', code: '2SK-8F3K9', buyer: 'Julia Widmer', value: 200, remaining: 200, soldAt: '02.06.2026', status: 'aktiv' },
  { id: 'v2', code: '2SK-QX71R', buyer: 'Pascal Baumann', value: 150, remaining: 60, soldAt: '18.05.2026', status: 'aktiv' },
  { id: 'v3', code: '2SK-M2LZ4', buyer: 'Laura Frei', value: 100, remaining: 0, soldAt: '03.03.2026', status: 'eingelöst' },
  { id: 'v4', code: '2SK-7H0A2', buyer: 'Michael Keller', value: 50, remaining: 50, soldAt: '11.06.2024', status: 'aktiv' },
];

const KPIS = [
  { label: 'Verkauft (Total)', value: "CHF 3'450" },
  { label: 'Offener Restwert', value: "CHF 1'180" },
  { label: 'Aktive Gutscheine', value: '14' },
  { label: 'Eingelöst diesen Monat', value: 'CHF 640' },
];

function NewVoucherModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('2SK-' + Math.random().toString(36).slice(2, 7).toUpperCase());
  return (
    <Modal title="Gutschein erstellen" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Code
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, fontFamily: 'monospace' }}>{code}</div>
          <button className="btn btn-secondary" onClick={() => setCode('2SK-' + Math.random().toString(36).slice(2, 7).toUpperCase())}>
            ↻
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Wert (CHF)
        </div>
        <input style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }} placeholder="z.B. 150" />
      </div>
      <div style={{ marginBottom: 22 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Käufer (optional)
        </div>
        <input style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }} placeholder="Kunde suchen…" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Erstellen
        </button>
      </div>
    </Modal>
  );
}

export default function Gutscheine() {
  const [filter, setFilter] = useState<'alle' | 'aktiv' | 'eingelöst'>('alle');
  const [showNew, setShowNew] = useState(false);

  const filtered = MOCK_VOUCHERS.filter((v) => filter === 'alle' || v.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontSize: 24 }}>Gutscheine</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Neuer Gutschein
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input placeholder="Code oder Kunde suchen…" style={{ border: '1px solid var(--color-border)', padding: '8px 14px', fontSize: 12, borderRadius: 4, width: 220 }} />
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {(['alle', 'aktiv', 'eingelöst'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '8px 14px', background: filter === f ? '#111' : 'transparent', color: filter === f ? '#fff' : '#555', border: 'none', textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ border: '1px solid #eee', background: '#fbfaf8', borderRadius: 6, padding: 16 }}>
            <div className="label-uppercase" style={{ marginBottom: 8 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

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
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 90px 90px 100px 90px',
            padding: '14px 12px',
            fontSize: 13,
            borderBottom: '1px solid #eee',
            alignItems: 'center',
            color: v.status === 'eingelöst' ? '#999' : '#111',
          }}
        >
          <div style={{ fontFamily: 'monospace' }}>{v.code}</div>
          <div>{v.buyer}</div>
          <div>CHF {v.value}</div>
          <div>CHF {v.remaining}</div>
          <div>{v.soldAt}</div>
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

      {showNew && <NewVoucherModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
