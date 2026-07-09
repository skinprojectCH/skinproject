import { useMemo, useState } from 'react';
import Modal from '../components/Modal';

// ---------- Mock-Daten (später aus Supabase: services / products) ----------
const MOCK_SERVICES = [
  { id: 's1', name: 'Sleeve Session', durationMin: 180, price: 380 },
  { id: 's2', name: 'Cover-Up klein', durationMin: 90, price: 220 },
  { id: 's3', name: 'Piercing Ohr', durationMin: 20, price: 60 },
  { id: 's4', name: 'Beratung', durationMin: 30, price: 0 },
];

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Heilsalbe 50ml', price: 18 },
  { id: 'p2', name: 'Ohrstecker Titan', price: 25 },
  { id: 'p3', name: 'Studio T-Shirt', price: 35 },
];

const PAYMENT_METHODS = ['Karte', 'Bar', 'Twint', 'Rechnung'];

interface LineItem {
  id: string;
  label: string;
  kind: 'service' | 'product' | 'discount';
  qty: number;
  unitPrice: number;
  discountPct?: number;
}

interface SplitPayment {
  id: string;
  method: string;
  amount: number;
}

function chf(n: number) {
  return `CHF ${n.toFixed(2)}`;
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function AddServiceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: LineItem) => void }) {
  const [selected, setSelected] = useState(MOCK_SERVICES[0].id);
  const service = MOCK_SERVICES.find((s) => s.id === selected)!;

  return (
    <Modal title="Service hinzufügen" onClose={onClose}>
      <input placeholder="Service suchen…" style={searchInputStyle} />
      <div style={{ ...selectBoxStyle, marginBottom: 14 }}>
        <span>Alle Kategorien</span>
        <span style={{ color: '#999' }}>▾</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 260, overflowY: 'auto' }}>
        {MOCK_SERVICES.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelected(s.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: s.id === selected ? '1.5px solid var(--color-primary)' : '1px solid #eee',
              background: s.id === selected ? '#fbfaf8' : 'transparent',
              borderRadius: 4,
              padding: '10px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <div>
              {s.name} <span style={{ color: '#999', fontSize: 11 }}>· {s.durationMin} min</span>
            </div>
            <div style={{ fontWeight: 600 }}>CHF {s.price}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => {
            onAdd({ id: crypto.randomUUID(), label: `Service: ${service.name}`, kind: 'service', qty: 1, unitPrice: service.price });
            onClose();
          }}
        >
          Hinzufügen
        </button>
      </div>
    </Modal>
  );
}

function AddProductModal({ onClose, onAdd }: { onClose: () => void; onAdd: (items: LineItem[]) => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const total = MOCK_PRODUCTS.reduce((sum, p) => sum + (quantities[p.id] || 0) * p.price, 0);
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);

  function setQty(id: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  return (
    <Modal title="Artikel hinzufügen" onClose={onClose}>
      <input placeholder="Artikel suchen…" style={searchInputStyle} />
      <div style={{ ...selectBoxStyle, marginBottom: 14 }}>
        <span>Alle Kategorien</span>
        <span style={{ color: '#999' }}>▾</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 260, overflowY: 'auto' }}>
        {MOCK_PRODUCTS.map((p) => {
          const qty = quantities[p.id] || 0;
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: qty > 0 ? '1.5px solid var(--color-primary)' : '1px solid #eee',
                background: qty > 0 ? '#fbfaf8' : 'transparent',
                borderRadius: 4,
                padding: '10px 12px',
                fontSize: 13,
              }}
            >
              <div>
                {p.name} <span style={{ color: '#999', fontSize: 11 }}>· CHF {p.price}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setQty(p.id, -1)} style={stepperBtnStyle}>
                  −
                </button>
                <div style={{ minWidth: 14, textAlign: 'center', color: qty > 0 ? '#111' : '#999' }}>{qty}</div>
                <button onClick={() => setQty(p.id, 1)} style={stepperBtnStyle}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 16 }}>
        <div>{count} Artikel ausgewählt</div>
        <div style={{ fontWeight: 600, color: '#111' }}>{chf(total)}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => {
            const items: LineItem[] = MOCK_PRODUCTS.filter((p) => quantities[p.id] > 0).map((p) => ({
              id: crypto.randomUUID(),
              label: p.name,
              kind: 'product',
              qty: quantities[p.id],
              unitPrice: p.price,
            }));
            onAdd(items);
            onClose();
          }}
        >
          Hinzufügen
        </button>
      </div>
    </Modal>
  );
}

function CheckoutModal({
  subtotal,
  onClose,
  onComplete,
}: {
  subtotal: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [discountMode, setDiscountMode] = useState<'percent' | 'chf'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscountPct, setAppliedDiscountPct] = useState(0);
  const [payments, setPayments] = useState<SplitPayment[]>([]);

  const discountAmount = discountMode === 'percent' ? (subtotal * appliedDiscountPct) / 100 : appliedDiscountPct;
  const total = Math.max(0, subtotal - discountAmount);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const fullyPaid = Math.abs(paid - total) < 0.01 && total > 0;

  function applyDiscount() {
    const val = parseFloat(discountInput);
    if (!isNaN(val)) setAppliedDiscountPct(val);
  }

  function addPayment() {
    const remaining = Math.max(0, total - paid);
    setPayments((prev) => [...prev, { id: crypto.randomUUID(), method: 'Karte', amount: Math.round(remaining * 100) / 100 }]);
  }

  function updatePayment(id: string, patch: Partial<SplitPayment>) {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <Modal title="Kassieren" onClose={onClose} width={460}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#777', marginBottom: 4 }}>
        <div>Zwischentotal</div>
        <div>{chf(subtotal)}</div>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, margin: '10px 0 16px' }}>
        <div className="label-uppercase" style={{ marginBottom: 8 }}>
          Discount
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
            <button
              onClick={() => setDiscountMode('percent')}
              style={{ padding: '8px 12px', background: discountMode === 'percent' ? '#111' : 'transparent', color: discountMode === 'percent' ? '#fff' : '#777', border: 'none' }}
            >
              %
            </button>
            <button
              onClick={() => setDiscountMode('chf')}
              style={{ padding: '8px 12px', background: discountMode === 'chf' ? '#111' : 'transparent', color: discountMode === 'chf' ? '#fff' : '#777', border: 'none' }}
            >
              CHF
            </button>
          </div>
          <input
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }}
          />
          <button className="btn btn-primary" onClick={applyDiscount}>
            Anwenden
          </button>
        </div>
        {appliedDiscountPct > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-destructive)', marginTop: 8 }}>
            <div>Discount ({discountMode === 'percent' ? `${appliedDiscountPct}%` : chf(appliedDiscountPct)})</div>
            <div>– {chf(discountAmount)}</div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-heading)',
          fontSize: 20,
          fontWeight: 700,
          borderTop: '1.5px solid #111',
          paddingTop: 12,
          marginBottom: 18,
        }}
      >
        <div>Total</div>
        <div>{chf(total)}</div>
      </div>

      <div className="label-uppercase" style={{ marginBottom: 8 }}>
        Zahlung aufteilen
      </div>
      {payments.map((p) => (
        <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <select
            value={p.method}
            onChange={(e) => updatePayment(p.id, { method: e.target.value })}
            style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={p.amount}
            onChange={(e) => updatePayment(p.id, { amount: parseFloat(e.target.value) || 0 })}
            style={{ width: 110, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }}
          />
          <button onClick={() => removePayment(p.id)} style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}>
            ✕
          </button>
        </div>
      ))}
      <div onClick={addPayment} className="btn btn-accent" style={{ marginBottom: 14, cursor: 'pointer' }}>
        + Weitere Zahlungsart hinzufügen
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-bg)',
          borderRadius: 4,
          padding: '10px 14px',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, color: '#555' }}>
          Bezahlt: {chf(paid)} / {chf(total)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: fullyPaid ? '#1a7a3f' : '#999' }}>
          {fullyPaid ? '✓ Vollständig gedeckt' : 'noch offen'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', opacity: fullyPaid ? 1 : 0.4 }}
          disabled={!fullyPaid}
          onClick={onComplete}
        >
          Kassieren abschliessen
        </button>
      </div>
    </Modal>
  );
}

export default function Kasse() {
  const [items, setItems] = useState<LineItem[]>([
    { id: 'i1', label: 'Service: Cover-Up klein', kind: 'service', qty: 1, unitPrice: 220 },
    { id: 'i2', label: '+ Artikel Verkauf: Heilsalbe 50ml', kind: 'product', qty: 2, unitPrice: 18 },
  ]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completed, setCompleted] = useState(false);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0), [items]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function changeQty(id: string, delta: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }

  if (completed) {
    return (
      <div>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Kasse</h2>
        <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a7a3f', marginBottom: 8 }}>✓ Termin kassiert</div>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>Die Quittung wurde erstellt.</div>
          <button className="btn btn-secondary" onClick={() => setCompleted(false)}>
            Zurück zur Kasse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Kasse</h1>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>
            Aufgerufen über "Kassieren" im Termin-Bearbeiten-Dialog · 09:00 · Nina — oder direkt hier für Verkäufe ohne Termin (Laufkunde)
          </div>

          <div style={{ marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <div className="label-uppercase" style={{ marginBottom: 4 }}>
                Kunde
              </div>
              <div style={{ ...selectBoxStyle, width: 280 }}>
                <span>Michael Keller</span>
                <span style={{ color: '#999' }}>▾</span>
              </div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: '9px 14px', fontSize: 13, borderRadius: 4, color: '#555' }}>Laufkunde</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 90px 28px',
              padding: '10px 12px',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: '#999',
              borderBottom: '1px solid var(--color-border)',
              fontWeight: 600,
            }}
          >
            <div>Position</div>
            <div>Menge</div>
            <div>Preis</div>
            <div />
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 90px 28px',
                padding: '14px 12px',
                fontSize: 13,
                borderBottom: '1px solid #eee',
                alignItems: 'center',
              }}
            >
              <div>{item.label}</div>
              <div>
                {item.kind === 'product' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => changeQty(item.id, -1)} style={stepperBtnStyle}>
                      −
                    </button>
                    <div>{item.qty}</div>
                    <button onClick={() => changeQty(item.id, 1)} style={stepperBtnStyle}>
                      +
                    </button>
                  </div>
                )}
              </div>
              <div>{chf(item.qty * item.unitPrice)}</div>
              <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#999', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <TrashIcon />
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowServiceModal(true)}>
              + Service hinzufügen
            </button>
            <button className="btn btn-primary" onClick={() => setShowProductModal(true)}>
              + Artikel hinzufügen
            </button>
            <button className="btn btn-accent">+ Gutschein verkaufen</button>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Termin-Notiz, Dokumente & Fotos</div>
            <div style={{ fontSize: 12, color: '#555', border: '1px solid #eee', borderRadius: 4, padding: 10, marginBottom: 10, minHeight: 44 }}>
              Haut reagiert gut, nächste Session in 6 Wochen empfohlen.
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
              <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: '5px 12px' }}>Dokument hinzufügen</div>
              <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: '5px 12px' }}>Foto hinzufügen</div>
            </div>
          </div>
        </div>

        <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid #eee', paddingLeft: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
            <div>Total</div>
            <div>{chf(subtotal)}</div>
          </div>

          <div className="label-uppercase" style={{ marginBottom: 8 }}>
            Zahlungsart
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {PAYMENT_METHODS.map((m, i) => (
              <div
                key={m}
                style={{
                  border: i === 0 ? '1.5px solid #111' : '1px solid #ddd',
                  background: i === 0 ? '#111' : 'transparent',
                  color: i === 0 ? '#fff' : '#111',
                  borderRadius: 4,
                  padding: 10,
                  textAlign: 'center',
                  fontSize: 13,
                }}
              >
                {m}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 20 }}>
            Betrag muss aufteilbar sein — z.B. CHF 30 in Bar, Rest mit Karte.
          </div>

          <button
            onClick={() => setShowCheckout(true)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: 10,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #ddd',
              borderRadius: 4,
              marginBottom: 8,
              background: 'none',
            }}
          >
            Split Payment / Gutschein / Discount
          </button>
          <div className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 14, cursor: 'pointer' }} onClick={() => setShowCheckout(true)}>
            Kassieren
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div className="label-uppercase" style={{ marginBottom: 8 }}>
              Termin nicht kassieren?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#555' }}>Nicht erschienen</div>
              <div style={{ border: '1px solid var(--color-destructive)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: 'var(--color-destructive)' }}>Löschen</div>
            </div>
          </div>
        </div>
      </div>

      {showServiceModal && (
        <AddServiceModal
          onClose={() => setShowServiceModal(false)}
          onAdd={(item) => setItems((prev) => [...prev, item])}
        />
      )}
      {showProductModal && (
        <AddProductModal
          onClose={() => setShowProductModal(false)}
          onAdd={(newItems) => setItems((prev) => [...prev, ...newItems])}
        />
      )}
      {showCheckout && (
        <CheckoutModal
          subtotal={subtotal}
          onClose={() => setShowCheckout(false)}
          onComplete={() => {
            setShowCheckout(false);
            setCompleted(true);
          }}
        />
      )}
    </div>
  );
}

const searchInputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: '9px 10px',
  fontSize: 13,
  marginBottom: 14,
  fontFamily: 'var(--font-body)',
};

const selectBoxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: '9px 10px',
  fontSize: 13,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const stepperBtnStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  border: '1px solid #ddd',
  borderRadius: 4,
  background: 'none',
  fontSize: 12,
  lineHeight: '18px',
  cursor: 'pointer',
};
