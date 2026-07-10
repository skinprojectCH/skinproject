import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import {
  fetchServices,
  fetchProducts,
  fetchServiceCategories,
  fetchProductCategories,
  fetchCustomers,
  fetchLocations,
  fetchCurrentUserLocationId,
  checkoutOrder,
  fetchVoucherByCode,
  fetchAppointment,
  fetchAppointmentLineItems,
  fetchArtists,
  updateAppointment,
  deleteAppointment,
  type Service,
  type Product,
  type ServiceCategory,
  type ProductCategory,
  type Customer,
  type Location,
} from '../lib/queries';

const PAYMENT_METHODS = ['Karte', 'Bar', 'Rechnung', 'Gutschein'];
const SIMPLE_PAYMENT_METHODS = ['Karte', 'Bar', 'Rechnung']; // Gutschein braucht Code-Eingabe -> nur im Split-Dialog

interface LineItem {
  id: string;
  label: string;
  kind: 'service' | 'product' | 'voucher';
  refId: string;
  qty: number;
  unitPrice: number;
  voucherCode?: string;
}

interface SplitPayment {
  id: string;
  method: string;
  amount: number;
  voucherCode?: string;
  voucherId?: string | null;
  voucherRemaining?: number | null;
  voucherValue?: number | null;
  voucherChecking?: boolean;
  voucherError?: string | null;
}

function chf(n: number) {
  return `CHF ${n.toFixed(2)}`;
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
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

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function AddServiceModal({
  services,
  categories,
  onClose,
  onAdd,
}: {
  services: Service[];
  categories: ServiceCategory[];
  onClose: () => void;
  onAdd: (item: LineItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const filtered = services.filter((s) => (!categoryFilter || s.category_id === categoryFilter) && s.name.toLowerCase().includes(search.toLowerCase()));
  const [selected, setSelected] = useState(services[0]?.id || '');
  const service = services.find((s) => s.id === selected);

  return (
    <Modal title="Service hinzufügen" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', flex: 1, color: '#555' }}>
          <SearchIcon />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Service suchen…" style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' }} />
        </div>
      </div>
      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', marginBottom: 14, color: categoryFilter ? '#111' : '#777', fontFamily: 'var(--font-body)' }}>
        <option value="">Alle Kategorien</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 260, overflowY: 'auto' }}>
        {filtered.map((s) => (
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
              {s.name} <span style={{ color: '#999', fontSize: 11 }}>· {s.duration_minutes} min</span>
            </div>
            <div style={{ fontWeight: 600 }}>CHF {s.price}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ fontSize: 13, color: '#999', padding: '10px 0' }}>Keine Services gefunden.</div>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => {
            if (!service) return;
            onAdd({ id: crypto.randomUUID(), label: `Service: ${service.name}`, kind: 'service', refId: service.id, qty: 1, unitPrice: service.price });
            onClose();
          }}
        >
          Hinzufügen
        </button>
      </div>
    </Modal>
  );
}

function AddProductModal({
  products,
  categories,
  onClose,
  onAdd,
}: {
  products: Product[];
  categories: ProductCategory[];
  onClose: () => void;
  onAdd: (items: LineItem[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const filtered = products.filter((p) => (!categoryFilter || p.category_id === categoryFilter) && p.name.toLowerCase().includes(search.toLowerCase()));
  const total = products.reduce((sum, p) => sum + (quantities[p.id] || 0) * p.price, 0);
  const count = Object.values(quantities).reduce((a, b) => a + b, 0);

  function setQty(id: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  }

  return (
    <Modal title="Artikel hinzufügen" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', flex: 1, color: '#555' }}>
          <SearchIcon />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artikel suchen…" style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' }} />
        </div>
      </div>
      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', marginBottom: 14, color: categoryFilter ? '#111' : '#777', fontFamily: 'var(--font-body)' }}>
        <option value="">Alle Kategorien</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18, maxHeight: 260, overflowY: 'auto' }}>
        {filtered.map((p) => {
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
        {filtered.length === 0 && <div style={{ fontSize: 13, color: '#999', padding: '10px 0' }}>Keine Artikel gefunden.</div>}
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
            const items: LineItem[] = products
              .filter((p) => quantities[p.id] > 0)
              .map((p) => ({ id: crypto.randomUUID(), label: p.name, kind: 'product', refId: p.id, qty: quantities[p.id], unitPrice: p.price }));
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

function generateVoucherCode() {
  return '2SK-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function SellVoucherModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: LineItem) => void }) {
  const [value, setValue] = useState('');
  const [code, setCode] = useState(generateVoucherCode());
  const [error, setError] = useState<string | null>(null);

  const numValue = parseFloat(value);
  const valid = !isNaN(numValue) && numValue > 0;

  return (
    <Modal title="Gutschein verkaufen" onClose={onClose} width={380}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Wert (CHF)
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }}
          placeholder="z.B. 100"
          inputMode="decimal"
          autoFocus
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Gutschein-Code
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, fontFamily: 'monospace' }}>{code}</div>
          <button className="btn btn-secondary" onClick={() => setCode(generateVoucherCode())}>
            ↻
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Wird erst beim Abschliessen des Verkaufs tatsächlich erstellt.</div>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', opacity: valid ? 1 : 0.5 }}
          disabled={!valid}
          onClick={() => {
            if (!valid) {
              setError('Bitte einen gültigen Wert eingeben.');
              return;
            }
            onAdd({ id: crypto.randomUUID(), label: `Gutschein ${code}`, kind: 'voucher', refId: code, qty: 1, unitPrice: numValue, voucherCode: code });
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
  onComplete: (payments: { method: string; amount: number; voucher_id?: string | null }[], total: number, discountType: 'percent' | 'chf' | null, discountValue: number) => Promise<void>;
}) {
  const [discountMode, setDiscountMode] = useState<'percent' | 'chf'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscountPct, setAppliedDiscountPct] = useState(0);
  const [payments, setPayments] = useState<SplitPayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountAmount = discountMode === 'percent' ? (subtotal * appliedDiscountPct) / 100 : appliedDiscountPct;
  const total = Math.max(0, subtotal - discountAmount);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const gutscheinRowsValid = payments
    .filter((p) => p.method === 'Gutschein')
    .every((p) => p.voucherId && p.voucherRemaining != null && p.amount <= p.voucherRemaining + 0.001);
  const fullyPaid = Math.abs(paid - total) < 0.01 && gutscheinRowsValid;

  function applyDiscount() {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0) setAppliedDiscountPct(val);
  }

  function addPayment() {
    const remaining = Math.max(0, total - paid);
    setPayments((prev) => [...prev, { id: crypto.randomUUID(), method: 'Karte', amount: Math.round(remaining * 100) / 100 }]);
  }

  function updatePayment(id: string, patch: Partial<SplitPayment>) {
    setPayments((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      // Wenn eine Zahlung (nicht die letzte) manuell geändert wird, den Rest automatisch
      // in die letzte Zahlungsart packen, damit man nicht selbst nachrechnen muss.
      if (patch.amount !== undefined && updated.length > 1) {
        const editedIndex = updated.findIndex((p) => p.id === id);
        const lastIndex = updated.length - 1;
        if (editedIndex !== lastIndex) {
          const sumExceptLast = updated.slice(0, lastIndex).reduce((sum, p) => sum + p.amount, 0);
          const remaining = Math.max(0, Math.round((total - sumExceptLast) * 100) / 100);
          updated[lastIndex] = { ...updated[lastIndex], amount: remaining };
        }
      }
      return updated;
    });
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  async function checkVoucherCode(id: string) {
    const payment = payments.find((p) => p.id === id);
    if (!payment || !payment.voucherCode) return;
    updatePayment(id, { voucherChecking: true, voucherError: null, voucherId: null, voucherRemaining: null });
    try {
      const voucher = await fetchVoucherByCode(payment.voucherCode);
      if (!voucher) {
        updatePayment(id, { voucherChecking: false, voucherError: 'Gutschein-Code nicht gefunden.' });
        return;
      }
      if (voucher.status === 'eingelöst' || voucher.remaining_value <= 0) {
        updatePayment(id, { voucherChecking: false, voucherError: 'Dieser Gutschein ist bereits vollständig eingelöst.' });
        return;
      }
      if (voucher.status === 'abgelaufen') {
        updatePayment(id, { voucherChecking: false, voucherError: 'Dieser Gutschein ist abgelaufen.' });
        return;
      }
      const cappedAmount = Math.min(payment.amount, voucher.remaining_value);
      updatePayment(id, { voucherChecking: false, voucherError: null, voucherId: voucher.id, voucherRemaining: voucher.remaining_value, voucherValue: voucher.value, amount: cappedAmount });
    } catch (e: any) {
      updatePayment(id, { voucherChecking: false, voucherError: e.message });
    }
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      await onComplete(
        payments.map((p) => ({ method: p.method, amount: p.amount, voucher_id: p.voucherId || null })),
        total,
        appliedDiscountPct > 0 ? discountMode : null,
        appliedDiscountPct
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
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
            <button onClick={() => setDiscountMode('percent')} style={{ padding: '8px 12px', background: discountMode === 'percent' ? '#111' : 'transparent', color: discountMode === 'percent' ? '#fff' : '#777', border: 'none' }}>
              %
            </button>
            <button onClick={() => setDiscountMode('chf')} style={{ padding: '8px 12px', background: discountMode === 'chf' ? '#111' : 'transparent', color: discountMode === 'chf' ? '#fff' : '#777', border: 'none' }}>
              CHF
            </button>
          </div>
          <input value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }} />
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

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, borderTop: '1.5px solid #111', paddingTop: 12, marginBottom: 18 }}>
        <div>Total</div>
        <div>{chf(total)}</div>
      </div>

      <div className="label-uppercase" style={{ marginBottom: 8 }}>
        Zahlung aufteilen
      </div>
      {payments.map((p) => (
        <div key={p.id} style={{ marginBottom: 10 }}>
          {p.method === 'Gutschein' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={p.method}
                onChange={(e) => updatePayment(p.id, { method: e.target.value, voucherId: null, voucherRemaining: null, voucherError: null, voucherCode: '' })}
                style={{
                  border: 'none',
                  borderRadius: 4,
                  padding: '9px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#111',
                  color: '#fff',
                  width: 108,
                  flexShrink: 0,
                }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input
                value={p.voucherCode || ''}
                onChange={(e) => updatePayment(p.id, { voucherCode: e.target.value, voucherId: null, voucherRemaining: null, voucherError: null })}
                onBlur={() => checkVoucherCode(p.id)}
                placeholder="Gutschein-Code"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13, fontFamily: 'monospace' }}
              />
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
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={p.method}
                onChange={(e) => updatePayment(p.id, { method: e.target.value, voucherId: null, voucherRemaining: null, voucherError: null, voucherCode: '' })}
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <input type="number" value={p.amount} onChange={(e) => updatePayment(p.id, { amount: parseFloat(e.target.value) || 0 })} style={{ width: 110, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }} />
              <button onClick={() => removePayment(p.id)} style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}>
                ✕
              </button>
            </div>
          )}
          {p.method === 'Gutschein' && (
            <div style={{ marginTop: 4, paddingLeft: 2 }}>
              {p.voucherChecking && <div style={{ fontSize: 11, color: '#999' }}>Prüft Gutschein…</div>}
              {p.voucherError && <div style={{ fontSize: 11, color: 'var(--color-destructive)' }}>{p.voucherError}</div>}
              {p.voucherId && p.voucherRemaining != null && (
                <div style={{ fontSize: 11, color: p.amount > p.voucherRemaining ? 'var(--color-destructive)' : '#777' }}>
                  Restwert Gutschein: CHF {p.voucherRemaining.toFixed(2)} von CHF {(p.voucherValue ?? p.voucherRemaining).toFixed(2)}
                  {p.amount > p.voucherRemaining && ' — Betrag übersteigt Guthaben'}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div onClick={addPayment} className="btn btn-accent" style={{ marginBottom: 14, cursor: 'pointer' }}>
        + Weitere Zahlungsart hinzufügen
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg)', borderRadius: 4, padding: '10px 14px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#555' }}>
          Bezahlt: {chf(paid)} / {chf(total)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: fullyPaid ? '#1a7a3f' : '#999' }}>{fullyPaid ? '✓ Vollständig gedeckt' : 'noch offen'}</div>
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', opacity: fullyPaid && !saving ? 1 : 0.4 }}
          disabled={!fullyPaid || saving}
          onClick={handleComplete}
        >
          {saving ? 'Speichert…' : 'Kassieren abschliessen'}
        </button>
      </div>
    </Modal>
  );
}

function CustomerSearchSelect({ customers, value, onChange }: { customers: Customer[]; value: string; onChange: (id: string) => void }) {
  const selected = customers.find((c) => c.id === value) || null;
  const [query, setQuery] = useState(selected ? `${selected.vorname} ${selected.name}` : '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected ? `${selected.vorname} ${selected.name}` : '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = customers.filter((c) => {
    const haystack = `${c.vorname} ${c.name} ${c.phone || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div style={{ position: 'relative', width: 280 }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Laufkunde — Name oder Telefon suchen…"
        style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', fontFamily: 'var(--font-body)' }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            onMouseDown={() => {
              onChange('');
              setQuery('');
              setOpen(false);
            }}
            style={{ padding: '9px 12px', fontSize: 13, color: '#777', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
          >
            Laufkunde (kein Kunde)
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              onMouseDown={() => {
                onChange(c.id);
                setQuery(`${c.vorname} ${c.name}`);
                setOpen(false);
              }}
              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
            >
              <div>
                {c.vorname} {c.name}
              </div>
              {c.phone && <div style={{ color: '#999' }}>{c.phone}</div>}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '9px 12px', fontSize: 13, color: '#999' }}>Keine Treffer.</div>}
        </div>
      )}
    </div>
  );
}

export default function Kasse() {
  const location = useLocation();
  const navigate = useNavigate();
  const appointmentId = (location.state as { appointmentId?: string } | null)?.appointmentId;

  const [items, setItems] = useState<LineItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [alreadyKassiert, setAlreadyKassiert] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locationLocked, setLocationLocked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [checkingOutDirect, setCheckingOutDirect] = useState(false);
  const [directCheckoutError, setDirectCheckoutError] = useState<string | null>(null);
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [noShowError, setNoShowError] = useState<string | null>(null);
  const [confirmDeleteAppointment, setConfirmDeleteAppointment] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState(false);

  useEffect(() => {
    Promise.all([fetchServices(), fetchProducts(), fetchServiceCategories(), fetchProductCategories(), fetchCustomers(), fetchLocations(), fetchCurrentUserLocationId()])
      .then(([s, p, sc, pc, c, locs, accountLocationId]) => {
        setServices(s.filter((sv) => sv.active));
        setProducts(p.filter((pr) => pr.active));
        setServiceCategories(sc);
        setProductCategories(pc);
        setCustomers(c);
        setLocations(locs);
        const accountValid = accountLocationId && locs.some((l) => l.id === accountLocationId);
        setSelectedLocationId(accountValid ? accountLocationId! : locs[0]?.id || '');
      })
      .finally(() => setLoading(false));
  }, []);

  // Falls über "Kassieren" im Termin-Dialog aufgerufen: Termin laden und Warenkorb vorbefüllen.
  useEffect(() => {
    if (!appointmentId) return;
    (async () => {
      try {
        const [appt, lineItems, allArtists] = await Promise.all([fetchAppointment(appointmentId), fetchAppointmentLineItems(appointmentId), fetchArtists()]);
        const artist = allArtists.find((a) => a.id === appt.artist_id);
        if (appt.status === 'kassiert') {
          setAlreadyKassiert(true);
          return;
        }
        if (appt.customer_id) {
          setSelectedCustomerId(appt.customer_id);
        }
        if (appt.location_id) {
          setSelectedLocationId(appt.location_id);
          setLocationLocked(true);
        }
        setContextLabel(`Termin: ${artist?.name || '—'} · ${new Date(appt.start_time).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
        setItems(
          (lineItems as any[]).map((li) => ({
            id: crypto.randomUUID(),
            label: `Service: ${li.services?.name || 'Unbekannt'}`,
            kind: 'service' as const,
            refId: li.service_id,
            qty: li.quantity,
            unitPrice: li.unit_price,
          }))
        );
      } catch (e: any) {
        setContextError(e.message);
      }
    })();
  }, [appointmentId]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0), [items]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function changeQty(id: string, delta: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }

  async function handleCheckoutComplete(payments: { method: string; amount: number; voucher_id?: string | null }[], total: number, discountType: 'percent' | 'chf' | null, discountValue: number) {
    await checkoutOrder({
      appointmentId: appointmentId || null,
      customerId: selectedCustomerId || null,
      locationId: selectedLocationId || null,
      subtotal,
      discountType,
      discountValue: discountType ? discountValue : null,
      total,
      lineItems: items.map((i) => ({
        service_id: i.kind === 'service' ? i.refId : null,
        product_id: i.kind === 'product' ? i.refId : null,
        description: i.label,
        quantity: i.qty,
        unit_price: i.unitPrice,
        line_total: i.qty * i.unitPrice,
      })),
      payments: payments.map((p) => ({ ...p, method: p.method.toLowerCase() })),
      vouchersToCreate: items
        .filter((i) => i.kind === 'voucher')
        .map((i) => ({ code: i.voucherCode || i.refId, value: i.unitPrice, buyer_customer_id: selectedCustomerId || null })),
    });
    setShowCheckout(false);
    setCompleted(true);
    setItems([]);
  }

  async function handleDirectCheckout() {
    if (!paymentMethod || items.length === 0) return;
    setCheckingOutDirect(true);
    setDirectCheckoutError(null);
    try {
      await handleCheckoutComplete([{ method: paymentMethod, amount: subtotal }], subtotal, null, 0);
    } catch (e: any) {
      setDirectCheckoutError(e.message);
    } finally {
      setCheckingOutDirect(false);
    }
  }

  async function handleMarkNoShow() {
    if (!appointmentId) return;
    setMarkingNoShow(true);
    setNoShowError(null);
    try {
      await updateAppointment(appointmentId, { status: 'nicht_erschienen' });
      navigate('/kalender');
    } catch (e: any) {
      setNoShowError(e.message);
      setMarkingNoShow(false);
    }
  }

  async function handleDeleteAppointmentFromKasse() {
    if (!appointmentId) return;
    setDeletingAppointment(true);
    setNoShowError(null);
    try {
      await deleteAppointment(appointmentId);
      navigate('/kalender');
    } catch (e: any) {
      setNoShowError(e.message);
      setDeletingAppointment(false);
    }
  }

  if (loading) return <div style={{ fontSize: 13, color: '#999' }}>Lädt…</div>;

  if (alreadyKassiert) {
    return (
      <div>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Kasse</h2>
        <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Dieser Termin wurde bereits kassiert.</div>
          <div style={{ fontSize: 13, color: '#999' }}>Er kann nicht ein zweites Mal kassiert werden.</div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div>
        <h2 style={{ fontSize: 26, marginBottom: 12 }}>Kasse</h2>
        <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1a7a3f', marginBottom: 8 }}>✓ Kassiert & in Supabase gespeichert</div>
          <button className="btn btn-secondary" onClick={() => setCompleted(false)}>
            Zurück zur Kasse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', gap: 28, alignItems: 'stretch', minHeight: 'inherit' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Kasse</h1>
          {contextError ? (
            <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 20 }}>Fehler beim Laden des Termins: {contextError}</div>
          ) : (
            <>
              {contextLabel && <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, marginBottom: 10 }}>{contextLabel}</div>}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                  <div className="label-uppercase" style={{ marginBottom: 4 }}>
                    Kunde
                  </div>
                  <CustomerSearchSelect customers={customers} value={selectedCustomerId} onChange={setSelectedCustomerId} />
                </div>
                <div>
                  <div className="label-uppercase" style={{ marginBottom: 4 }}>
                    Standort
                  </div>
                  {locationLocked ? (
                    <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: 200, color: '#555' }}>
                      {locations.find((l) => l.id === selectedLocationId)?.name || '—'}
                    </div>
                  ) : (
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: 200, fontFamily: 'var(--font-body)' }}
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </>
          )}

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
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 28px', padding: '14px 12px', fontSize: 13, borderBottom: '1px solid #ddd', alignItems: 'center' }}>
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
          {items.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Warenkorb leer — Service oder Artikel hinzufügen.</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setShowServiceModal(true)}>
              + Service hinzufügen
            </button>
            <button className="btn btn-outline" onClick={() => setShowProductModal(true)}>
              + Artikel hinzufügen
            </button>
            <button className="btn btn-outline" onClick={() => setShowVoucherModal(true)}>
              + Gutschein verkaufen
            </button>
          </div>
        </div>

        <div style={{ width: 320, flexShrink: 0, background: '#fff', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
            <div>Total</div>
            <div>{chf(subtotal)}</div>
          </div>

          <div className="label-uppercase" style={{ marginBottom: 8 }}>
            Zahlungsart
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {SIMPLE_PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`payment-method-btn${paymentMethod === m ? ' payment-method-btn--selected' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCheckout(true)}
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
          >
            <GridIcon /> Split Payment / Gutschein / Discount
          </button>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10, opacity: items.length && paymentMethod ? 1 : 0.4 }}
            disabled={items.length === 0 || !paymentMethod || checkingOutDirect}
            onClick={handleDirectCheckout}
          >
            {checkingOutDirect ? 'Speichert…' : 'Kassieren'}
          </button>

          {directCheckoutError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 10 }}>{directCheckoutError}</div>}

          {appointmentId && !alreadyKassiert && (
            <div style={{ borderTop: '1px solid #eee', marginTop: 20, paddingTop: 16 }}>
              <div className="label-uppercase" style={{ marginBottom: 8 }}>
                Termin nicht kassieren?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', opacity: markingNoShow ? 0.6 : 1 }}
                  disabled={markingNoShow}
                  onClick={handleMarkNoShow}
                >
                  {markingNoShow ? 'Speichert…' : 'Nicht erschienen'}
                </button>
                {!confirmDeleteAppointment ? (
                  <button className="btn btn-destructive" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setConfirmDeleteAppointment(true)}>
                    Löschen
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDeleteAppointment(false)}>
                      Doch nicht
                    </button>
                    <button
                      className="btn btn-destructive"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--color-destructive)', color: '#fff', opacity: deletingAppointment ? 0.6 : 1 }}
                      disabled={deletingAppointment}
                      onClick={handleDeleteAppointmentFromKasse}
                    >
                      {deletingAppointment ? 'Löscht…' : 'Wirklich löschen'}
                    </button>
                  </div>
                )}
              </div>
              {noShowError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginTop: 8 }}>{noShowError}</div>}
            </div>
          )}
        </div>
      </div>

      {showServiceModal && (
        <AddServiceModal services={services} categories={serviceCategories} onClose={() => setShowServiceModal(false)} onAdd={(item) => setItems((prev) => [...prev, item])} />
      )}
      {showProductModal && (
        <AddProductModal products={products} categories={productCategories} onClose={() => setShowProductModal(false)} onAdd={(newItems) => setItems((prev) => [...prev, ...newItems])} />
      )}
      {showVoucherModal && <SellVoucherModal onClose={() => setShowVoucherModal(false)} onAdd={(item) => setItems((prev) => [...prev, item])} />}
      {showCheckout && (
        <CheckoutModal
          subtotal={subtotal}
          onClose={() => setShowCheckout(false)}
          onComplete={async (payments, total, discountType, discountValue) => {
            await handleCheckoutComplete(payments, total, discountType, discountValue);
          }}
        />
      )}
    </div>
  );
}

const stepperBtnStyle: React.CSSProperties = { width: 20, height: 20, border: '1px solid #ddd', borderRadius: 4, background: 'none', fontSize: 12, lineHeight: '18px', cursor: 'pointer' };
