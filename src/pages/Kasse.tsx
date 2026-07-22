import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { roundToRappen } from '../lib/format';
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
  fetchActiveAnzahlungForCustomer,
  sellAnzahlung,
  fetchAppointment,
  fetchAppointmentLineItems,
  fetchOrderForAppointment,
  fetchOrderById,
  fetchArtists,
  updateAppointment,
  deleteAppointment,
  fetchDocumentsForAppointment,
  uploadCustomerFile,
  getCustomerFileUrl,
  deleteCustomerDocument,
  type Service,
  type Product,
  type ServiceCategory,
  type ProductCategory,
  type Customer,
  type Location,
  type CustomerDocument,
  type Artist,
  type Voucher,
} from '../lib/queries';

const PAYMENT_METHODS = ['Karte', 'Bar', 'Rechnung', 'Gutschein', 'Anzahlung'];
const SIMPLE_PAYMENT_METHODS = ['Karte', 'Bar', 'Rechnung']; // Gutschein/Anzahlung brauchen Zusatzschritt -> nur im Split-Dialog

interface LineItem {
  id: string;
  label: string;
  kind: 'service' | 'product' | 'voucher';
  refId: string;
  qty: number;
  unitPrice: number;
  voucherCode?: string;
  discountType?: 'percent' | 'chf' | null;
  discountValue?: number | null;
}

function lineItemTotal(item: LineItem): number {
  const gross = item.qty * item.unitPrice;
  if (!item.discountType || !item.discountValue) return gross;
  if (item.discountType === 'percent') return Math.max(0, gross * (1 - item.discountValue / 100));
  return Math.max(0, gross - item.discountValue);
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
  return `CHF ${roundToRappen(n).toFixed(2)}`;
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
            <div style={{ fontWeight: 600 }}>{chf(s.price)}</div>
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
                {p.name} <span style={{ color: '#999', fontSize: 11 }}>· {chf(p.price)}</span>
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

function SellAnzahlungModal({
  customerId,
  customerName,
  locationId,
  onClose,
  onSold,
}: {
  customerId: string;
  customerName: string;
  locationId: string | null;
  onClose: () => void;
  onSold: () => void;
}) {
  const [value, setValue] = useState('');
  const [method, setMethod] = useState('Karte');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const numValue = parseFloat(value);
  const valid = !isNaN(numValue) && numValue > 0;

  async function handleConfirm() {
    if (!valid) {
      setError('Bitte einen gültigen Betrag eingeben.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await sellAnzahlung({ customerId, locationId, amount: numValue, paymentMethod: method });
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Modal title="Anzahlung erfasst" onClose={onSold} width={380}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a7a3f', marginBottom: 8 }}>✓ CHF {numValue.toFixed(2)} erfasst</div>
          <div style={{ fontSize: 12, color: '#777', marginBottom: 20 }}>
            Gutgeschrieben für {customerName}. Zählt nicht als Umsatz, ist im Tagesabschluss unter "Anzahlung" sichtbar und kann bei einem künftigen Termin als Zahlungsart verwendet werden.
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onSold}>
            Schliessen
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Anzahlung erfassen" onClose={onClose} width={380}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        Für <strong style={{ color: 'var(--color-primary)' }}>{customerName}</strong>. Der Betrag zählt beim Verkauf bewusst nicht als Umsatz — erst wenn er später als Zahlungsart eingesetzt wird.
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Betrag (CHF)
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%' }}
          placeholder="z.B. 200"
          inputMode="decimal"
          autoFocus
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="label-uppercase" style={{ marginBottom: 4 }}>
          Erhalten als
        </div>
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 12 }}>
          {['Karte', 'Bar', 'Rechnung'].map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{ flex: 1, padding: '9px 0', background: method === m ? '#111' : 'transparent', color: method === m ? '#fff' : '#555', border: 'none', cursor: 'pointer' }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: valid && !saving ? 1 : 0.5 }} disabled={!valid || saving} onClick={handleConfirm}>
          {saving ? 'Speichert…' : 'Erfassen'}
        </button>
      </div>
    </Modal>
  );
}

function CheckoutModal({
  subtotal,
  initialMethod,
  customerId,
  initialAnzahlung,
  onClose,
  onComplete,
}: {
  subtotal: number;
  initialMethod?: string | null;
  customerId?: string | null;
  initialAnzahlung?: Voucher | null;
  onClose: () => void;
  onComplete: (payments: { method: string; amount: number; voucher_id?: string | null }[], total: number, discountType: 'percent' | 'chf' | null, discountValue: number) => Promise<void>;
}) {
  const [discountMode, setDiscountMode] = useState<'percent' | 'chf'>('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscountPct, setAppliedDiscountPct] = useState(0);
  const [payments, setPayments] = useState<SplitPayment[]>(() => {
    if (initialAnzahlung) {
      const amount = Math.min(subtotal, initialAnzahlung.remaining_value);
      const rows: SplitPayment[] = [
        { id: crypto.randomUUID(), method: 'Anzahlung', amount, voucherId: initialAnzahlung.id, voucherRemaining: initialAnzahlung.remaining_value, voucherValue: initialAnzahlung.value },
      ];
      if (amount < subtotal) {
        rows.push({ id: crypto.randomUUID(), method: initialMethod || 'Karte', amount: roundToRappen(subtotal - amount) });
      }
      return rows;
    }
    return initialMethod ? [{ id: crypto.randomUUID(), method: initialMethod, amount: subtotal }] : [];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerAnzahlung, setCustomerAnzahlung] = useState<Voucher | null>(initialAnzahlung || null);

  useEffect(() => {
    if (!customerId) {
      setCustomerAnzahlung(null);
      return;
    }
    fetchActiveAnzahlungForCustomer(customerId)
      .then(setCustomerAnzahlung)
      .catch(() => setCustomerAnzahlung(null));
  }, [customerId]);

  const discountAmount = discountMode === 'percent' ? (subtotal * appliedDiscountPct) / 100 : appliedDiscountPct;
  const total = roundToRappen(Math.max(0, subtotal - discountAmount));
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const gutscheinRowsValid = payments
    .filter((p) => p.method === 'Gutschein' || p.method === 'Anzahlung')
    .every((p) => p.voucherId && p.voucherRemaining != null && p.amount <= p.voucherRemaining + 0.001);
  const fullyPaid = Math.abs(paid - total) < 0.01 && gutscheinRowsValid;

  // Solange es nur EINE Zahlungsart gibt, deckt sie automatisch den ganzen (aktuellen)
  // Total ab — inkl. wenn sich der Total nachträglich durch einen Rabatt ändert.
  useEffect(() => {
    if (payments.length === 1 && payments[0].method !== 'Gutschein') {
      const rounded = Math.round(total * 100) / 100;
      if (payments[0].amount !== rounded) {
        setPayments([{ ...payments[0], amount: rounded }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

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
                onChange={(e) => {
                  const method = e.target.value;
                  if (method === 'Anzahlung' && customerAnzahlung) {
                    updatePayment(p.id, { method, voucherId: customerAnzahlung.id, voucherRemaining: customerAnzahlung.remaining_value, voucherValue: customerAnzahlung.value, voucherError: null, voucherCode: customerAnzahlung.code });
                  } else if (method === 'Anzahlung') {
                    updatePayment(p.id, { method, voucherId: null, voucherRemaining: null, voucherError: 'Kein Guthaben für diesen Kunden gefunden.', voucherCode: '' });
                  } else {
                    updatePayment(p.id, { method, voucherId: null, voucherRemaining: null, voucherError: null, voucherCode: '' });
                  }
                }}
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
          ) : p.method === 'Anzahlung' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={p.method}
                onChange={(e) => {
                  const method = e.target.value;
                  if (method === 'Anzahlung' && customerAnzahlung) {
                    updatePayment(p.id, { method, voucherId: customerAnzahlung.id, voucherRemaining: customerAnzahlung.remaining_value, voucherValue: customerAnzahlung.value, voucherError: null, voucherCode: customerAnzahlung.code });
                  } else if (method === 'Anzahlung') {
                    updatePayment(p.id, { method, voucherId: null, voucherRemaining: null, voucherError: 'Kein Guthaben für diesen Kunden gefunden.', voucherCode: '' });
                  } else {
                    updatePayment(p.id, { method, voucherId: null, voucherRemaining: null, voucherError: null, voucherCode: '' });
                  }
                }}
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
                type="number"
                value={p.amount}
                onChange={(e) => updatePayment(p.id, { amount: parseFloat(e.target.value) || 0 })}
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px', fontSize: 13 }}
              />
              <button onClick={() => removePayment(p.id)} style={{ background: 'none', border: 'none', fontSize: 14, color: '#999' }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={p.method}
                onChange={(e) => {
                  const method = e.target.value;
                  if (method === 'Anzahlung' && customerAnzahlung) {
                    updatePayment(p.id, { method, voucherId: customerAnzahlung.id, voucherRemaining: customerAnzahlung.remaining_value, voucherValue: customerAnzahlung.value, voucherError: null, voucherCode: customerAnzahlung.code });
                  } else if (method === 'Anzahlung') {
                    updatePayment(p.id, { method, voucherId: null, voucherRemaining: null, voucherError: 'Kein Guthaben für diesen Kunden gefunden.', voucherCode: '' });
                  } else {
                    updatePayment(p.id, { method, voucherId: null, voucherRemaining: null, voucherError: null, voucherCode: '' });
                  }
                }}
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
          {(p.method === 'Gutschein' || p.method === 'Anzahlung') && (
            <div style={{ marginTop: 4, paddingLeft: 2 }}>
              {p.voucherChecking && <div style={{ fontSize: 11, color: '#999' }}>Prüft Gutschein…</div>}
              {p.voucherError && <div style={{ fontSize: 11, color: 'var(--color-destructive)' }}>{p.voucherError}</div>}
              {p.voucherId && p.voucherRemaining != null && (
                <div style={{ fontSize: 11, color: p.amount > p.voucherRemaining ? 'var(--color-destructive)' : '#777' }}>
                  Restwert {p.method === 'Anzahlung' ? 'Anzahlung' : 'Gutschein'}: {chf(Math.max(0, p.voucherRemaining - p.amount))} von {chf(p.voucherValue ?? p.voucherRemaining)}
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
  const appointmentId = (location.state as { appointmentId?: string; orderId?: string } | null)?.appointmentId;
  const directOrderId = (location.state as { appointmentId?: string; orderId?: string } | null)?.orderId;

  const [items, setItems] = useState<LineItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showAnzahlungModal, setShowAnzahlungModal] = useState(false);
  const [anzahlungPrompt, setAnzahlungPrompt] = useState<Voucher | null>(null);
  const [applyAnzahlung, setApplyAnzahlung] = useState<Voucher | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [receipt, setReceipt] = useState<{
    items: LineItem[];
    total: number;
    payments: { method: string; amount: number }[];
    customerLabel: string;
    contextLabel: string | null;
    date: string;
    artist: Artist | null;
    location: Location | null;
  } | null>(null);

  const [contextLabel, setContextLabel] = useState<string | null>(null);
  const [activeArtist, setActiveArtist] = useState<Artist | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [alreadyKassiert, setAlreadyKassiert] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [checkingOutDirect, setCheckingOutDirect] = useState(false);
  const [directCheckoutError, setDirectCheckoutError] = useState<string | null>(null);
  const [markingNoShow, setMarkingNoShow] = useState(false);
  const [noShowError, setNoShowError] = useState<string | null>(null);
  const [confirmDeleteAppointment, setConfirmDeleteAppointment] = useState(false);
  const [deletingAppointment, setDeletingAppointment] = useState(false);

  const [apptNotes, setApptNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [apptDocuments, setApptDocuments] = useState<CustomerDocument[]>([]);
  const [apptPhotos, setApptPhotos] = useState<CustomerDocument[]>([]);
  const [apptFilesLoading, setApptFilesLoading] = useState(false);
  const [uploadingApptPhoto, setUploadingApptPhoto] = useState(false);
  const [apptFileError, setApptFileError] = useState<string | null>(null);
  const [apptPhotoUrls, setApptPhotoUrls] = useState<Record<string, string>>({});
  const [apptLightboxUrl, setApptLightboxUrl] = useState<string | null>(null);
  const apptPhotoInputRef = useRef<HTMLInputElement>(null);

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

  // Falls über einen Kassenbuch-Eintrag (Laufkunden-Verkauf ohne Termin) aufgerufen:
  // Quittung direkt aus der Bestellung rekonstruieren, ohne Termin/Artist-Bezug.
  useEffect(() => {
    if (!directOrderId || appointmentId) return;
    (async () => {
      try {
        const [orderData, allLocations, allCustomers] = await Promise.all([fetchOrderById(directOrderId), fetchLocations(), fetchCustomers()]);
        if (!orderData) return;
        const { order, lineItems: dbLineItems, payments: dbPayments } = orderData;
        const reconstructedItems: LineItem[] = dbLineItems.map((li: any) => ({
          id: li.id,
          label: li.description,
          kind: li.service_id ? 'service' : li.product_id ? 'product' : 'voucher',
          refId: li.service_id || li.product_id || '',
          qty: li.quantity,
          unitPrice: Number(li.unit_price),
          discountType: li.discount_type || null,
          discountValue: li.discount_value != null ? Number(li.discount_value) : null,
        }));
        const customer = allCustomers.find((c) => c.id === order.customer_id);
        setReceipt({
          items: reconstructedItems,
          total: Number(order.total),
          payments: dbPayments.map((p: any) => ({ method: p.method, amount: Number(p.amount) })),
          customerLabel: customer ? `${customer.vorname} ${customer.name}` : 'Laufkunde',
          contextLabel: null,
          date: new Date(order.created_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          artist: null,
          location: allLocations.find((l) => l.id === order.location_id) || null,
        });
        setCompleted(true);
      } catch (e: any) {
        setContextError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [directOrderId, appointmentId]);

  // Falls über "Kassieren" im Termin-Dialog aufgerufen: Termin laden und Warenkorb vorbefüllen.
  useEffect(() => {
    if (!appointmentId) return;
    (async () => {
      try {
        const [appt, lineItems, allArtists] = await Promise.all([fetchAppointment(appointmentId), fetchAppointmentLineItems(appointmentId), fetchArtists()]);
        const artist = allArtists.find((a) => a.id === appt.artist_id);
        setActiveArtist(artist || null);
        if (appt.status === 'kassiert') {
          setAlreadyKassiert(true);
          try {
            const [orderData, allLocations, allCustomers] = await Promise.all([fetchOrderForAppointment(appointmentId), fetchLocations(), fetchCustomers()]);
            if (orderData) {
              const { order, lineItems: dbLineItems, payments: dbPayments } = orderData;
              const reconstructedItems: LineItem[] = dbLineItems.map((li: any) => ({
                id: li.id,
                label: li.description,
                kind: li.service_id ? 'service' : li.product_id ? 'product' : 'voucher',
                refId: li.service_id || li.product_id || '',
                qty: li.quantity,
                unitPrice: Number(li.unit_price),
                discountType: li.discount_type || null,
                discountValue: li.discount_value != null ? Number(li.discount_value) : null,
              }));
              const customer = allCustomers.find((c) => c.id === appt.customer_id);
              setReceipt({
                items: reconstructedItems,
                total: Number(order.total),
                payments: dbPayments.map((p: any) => ({ method: p.method, amount: Number(p.amount) })),
                customerLabel: customer ? `${customer.vorname} ${customer.name}` : 'Laufkunde',
                contextLabel: `Termin: ${artist?.name || '—'} · ${new Date(appt.start_time).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
                date: new Date(order.created_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                artist: artist || null,
                location: allLocations.find((l) => l.id === (appt.location_id || order.location_id)) || null,
              });
              setCompleted(true);
            }
          } catch (e: any) {
            setContextError(e.message);
          }
          return;
        }
        if (appt.customer_id) {
          setSelectedCustomerId(appt.customer_id);
          fetchActiveAnzahlungForCustomer(appt.customer_id)
            .then((v) => {
              if (v) setAnzahlungPrompt(v);
            })
            .catch(() => {});
        }
        if (appt.location_id) {
          setSelectedLocationId(appt.location_id);
        }
        setContextLabel(`Termin: ${artist?.name || '—'} · ${new Date(appt.start_time).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
        setApptNotes(appt.notes || '');
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

  function reloadApptFiles() {
    if (!appointmentId) return;
    setApptFilesLoading(true);
    fetchDocumentsForAppointment(appointmentId)
      .then((docs) => {
        setApptDocuments(docs.filter((d) => d.type === 'document'));
        setApptPhotos(docs.filter((d) => d.type === 'photo'));
      })
      .catch((e) => setApptFileError(e.message))
      .finally(() => setApptFilesLoading(false));
  }

  useEffect(() => {
    if (!appointmentId) return;
    reloadApptFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  useEffect(() => {
    const missing = apptPhotos.filter((p) => !apptPhotoUrls[p.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (p) => {
        try {
          const url = await getCustomerFileUrl(p.storage_path);
          return [p.id, url] as const;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setApptPhotoUrls((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r[0]] = r[1];
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptPhotos]);

  async function handleNotesBlur() {
    if (!appointmentId) return;
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await updateAppointment(appointmentId, { notes: apptNotes.trim() || null });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (e: any) {
      setApptFileError(e.message);
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleApptFileSelected(file: File | undefined) {
    if (!file || !appointmentId || !selectedCustomerId) return;
    setApptFileError(null);
    setUploadingApptPhoto(true);
    try {
      await uploadCustomerFile(selectedCustomerId, file, 'photo', appointmentId);
      reloadApptFiles();
    } catch (e: any) {
      setApptFileError(e.message);
    } finally {
      setUploadingApptPhoto(false);
    }
  }

  async function openApptLightbox(doc: CustomerDocument) {
    try {
      const url = apptPhotoUrls[doc.id] || (await getCustomerFileUrl(doc.storage_path));
      setApptLightboxUrl(url);
    } catch (e: any) {
      setApptFileError(e.message);
    }
  }

  async function handleDeleteApptFile(doc: CustomerDocument) {
    try {
      await deleteCustomerDocument(doc);
      reloadApptFiles();
    } catch (e: any) {
      setApptFileError(e.message);
    }
  }

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + lineItemTotal(i), 0), [items]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function changeQty(id: string, delta: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }

  const [expandedDiscountId, setExpandedDiscountId] = useState<string | null>(null);

  function changePrice(id: string, value: string) {
    const parsed = parseFloat(value.replace(',', '.'));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, unitPrice: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 } : i)));
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
        discount_type: i.discountType || null,
        discount_value: i.discountValue || null,
        line_total: lineItemTotal(i),
      })),
      payments: payments.map((p) => ({ ...p, method: p.method.toLowerCase() })),
      vouchersToCreate: items
        .filter((i) => i.kind === 'voucher')
        .map((i) => ({ code: i.voucherCode || i.refId, value: i.unitPrice, buyer_customer_id: selectedCustomerId || null })),
    });
    setReceipt({
      items: [...items],
      total,
      payments,
      customerLabel: customers.find((c) => c.id === selectedCustomerId) ? `${customers.find((c) => c.id === selectedCustomerId)!.vorname} ${customers.find((c) => c.id === selectedCustomerId)!.name}` : 'Laufkunde',
      contextLabel,
      date: new Date().toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      artist: activeArtist,
      location: locations.find((l) => l.id === selectedLocationId) || null,
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
      const roundedSubtotal = roundToRappen(subtotal);
      await handleCheckoutComplete([{ method: paymentMethod, amount: roundedSubtotal }], roundedSubtotal, null, 0);
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

  if (!completed && alreadyKassiert) {
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
    const sharePct = receipt?.artist ? receipt.artist.revenue_share_pct ?? 0 : 100; // ohne Artist (Laufkunde) bleibt alles beim Salon
    const location = receipt?.location;
    const mwstActive = !!(location?.vat_number && location?.mwst_prozent);

    function receiptCard(variant: 'salon' | 'artist') {
      const rows = (receipt?.items || [])
        .map((i) => {
          const gross = i.qty * i.unitPrice;
          const full = lineItemTotal(i);
          const hasDiscount = !!i.discountType && !!i.discountValue;
          const discountLabel = hasDiscount ? (i.discountType === 'percent' ? `−${i.discountValue}%` : `−CHF ${i.discountValue}`) : null;
          if (i.kind === 'service') {
            const factor = variant === 'salon' ? sharePct / 100 : 1 - sharePct / 100;
            return { label: i.label, amount: full * factor, grossAmount: gross * factor, discountLabel };
          }
          // Artikel & Gutscheine gehören 100% dem Salon, erscheinen nicht auf der Artist-Quittung.
          if (variant === 'artist') return null;
          return { label: i.label, amount: full, grossAmount: gross, discountLabel };
        })
        .filter((r): r is { label: string; amount: number; grossAmount: number; discountLabel: string | null } => !!r);
      const cardTotal = rows.reduce((s, r) => s + r.amount, 0);
      const mwstAmount = mwstActive && location?.mwst_prozent ? cardTotal - cardTotal / (1 + location.mwst_prozent / 100) : 0;

      return (
        <div className="kasse-receipt-card" style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 18, background: '#fff', flex: '1 1 320px', maxWidth: 380 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', fontWeight: 700, marginBottom: 4 }}>
            Quittung {variant === 'salon' ? 'Salon' : 'Artist'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1 }}>{variant === 'salon' ? location?.name || '—' : receipt?.artist?.kuenstlername || receipt?.artist?.name || '—'}</div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
            {variant === 'salon' ? (
              <>
                {location?.strasse ? `${location.strasse}, ` : ''}
                {location?.plz_ort || ''}
              </>
            ) : (
              <>
                {receipt?.artist?.strasse ? `${receipt.artist.strasse}, ` : ''}
                {receipt?.artist?.plz_ort || ''}
              </>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#777', marginBottom: 12 }}>
            {receipt?.date}
            {receipt?.contextLabel ? ` · ${receipt.contextLabel.replace('Termin: ', '')}` : ''}
            {' · '}
            {receipt?.customerLabel}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {rows.length === 0 ? (
              <div style={{ fontSize: 12, color: '#999' }}>—</div>
            ) : (
              rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, gap: 8 }}>
                  <div>
                    {r.label}
                    {r.discountLabel && <span style={{ color: 'var(--color-accent)', fontSize: 11, fontWeight: 600, marginLeft: 6 }}>{r.discountLabel}</span>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.discountLabel && <span style={{ color: '#999', textDecoration: 'line-through', fontSize: 11, marginRight: 6 }}>{chf(r.grossAmount)}</span>}
                    {chf(r.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            <div>Total</div>
            <div>{chf(cardTotal)}</div>
          </div>
          {variant === 'salon' && mwstActive && (
            <div style={{ fontSize: 11, color: '#777', marginBottom: 8 }}>
              <div>
                MWST {location!.mwst_prozent}% (inkl.): {chf(mwstAmount)}
              </div>
              <div>MWST-Nr.: {location!.vat_number}</div>
            </div>
          )}
          {variant === 'salon' && (
            <div style={{ fontSize: 12, color: '#777' }}>
              {receipt?.payments.map((p, i) => (
                <div key={i}>
                  {p.method}: {chf(p.amount)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 720 }}>
        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 3mm; }
            .kasse-no-print { display: none !important; }
            .kasse-print-area {
              max-width: none !important;
              width: 100% !important;
              flex-direction: column !important;
            }
            .kasse-receipt-card {
              background: #fff !important;
              border: 1px solid #000 !important;
              box-shadow: none !important;
              max-width: none !important;
              width: 100% !important;
              color: #000 !important;
              page-break-inside: avoid;
            }
            .kasse-receipt-card * {
              background: transparent !important;
              color: #000 !important;
              text-shadow: none !important;
            }
          }
        `}</style>
        <h2 className="kasse-no-print" style={{ fontSize: 26, marginBottom: 12 }}>Kasse</h2>
        <div className="kasse-no-print" style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '28px 32px', textAlign: 'center', background: 'var(--color-accent-fill)', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a7a3f' }}>✓ Erfolgreich kassiert</div>
        </div>

        <div className="kasse-print-area" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
          {receiptCard('artist')}
          {receiptCard('salon')}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#999', marginBottom: 4 }}>Total kassiert</div>
          <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{chf(receipt?.total || 0)}</div>
        </div>

        <div className="kasse-no-print" style={{ textAlign: 'center', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            Quittungen drucken
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/kalender')}>
            Zurück zum Kalender
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
              <div style={{ border: '1px solid var(--color-warn-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-accent-fill)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                  <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: 200, color: '#555' }}>
                    {locations.find((l) => l.id === selectedLocationId)?.name || '—'}
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)', overflow: 'hidden' }}>
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

          {items.map((item) => {
            const gross = item.qty * item.unitPrice;
            const discounted = lineItemTotal(item);
            const hasDiscount = !!item.discountType && !!item.discountValue;
            const expanded = expandedDiscountId === item.id;
            return (
              <div key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 28px', padding: '14px 12px', fontSize: 13, alignItems: 'center' }}>
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
                  <div style={{ textAlign: 'right' }}>
                    {item.kind === 'service' ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                          CHF
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => changePrice(item.id, e.target.value)}
                            title="Preis nur für diesen Kassiervorgang anpassen — der Standardpreis der Dienstleistung bleibt unverändert."
                            style={{ width: 64, border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px 6px', fontSize: 13, textAlign: 'right', fontFamily: 'var(--font-body)' }}
                          />
                        </div>
                        {hasDiscount && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>= {chf(discounted)}</div>}
                      </div>
                    ) : hasDiscount ? (
                      <div>
                        <div style={{ fontSize: 11, color: '#999', textDecoration: 'line-through' }}>{chf(gross)}</div>
                        <div>{chf(discounted)}</div>
                      </div>
                    ) : (
                      chf(gross)
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#999', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <TrashIcon />
                  </button>
                </div>

                {item.kind !== 'voucher' && (
                  <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                    {!expanded ? (
                      <div onClick={() => setExpandedDiscountId(item.id)} style={{ fontSize: 11, color: hasDiscount ? 'var(--color-accent)' : '#999', fontWeight: 600, cursor: 'pointer' }}>
                        {hasDiscount ? `Rabatt: ${item.discountValue}${item.discountType === 'percent' ? '%' : ' CHF'} bearbeiten` : '+ Rabatt'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.discountValue ?? ''}
                          onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, discountValue: e.target.value ? parseFloat(e.target.value) : null, discountType: i.discountType || 'percent' } : i)))}
                          placeholder="0"
                          style={{ width: 60, border: '1px solid var(--color-border)', borderRadius: 4, padding: '4px 6px', fontSize: 12, textAlign: 'right', fontFamily: 'var(--font-body)' }}
                        />
                        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden', fontSize: 11 }}>
                          {(['percent', 'chf'] as const).map((t) => (
                            <div
                              key={t}
                              onClick={() => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, discountType: t } : i)))}
                              style={{ padding: '4px 8px', cursor: 'pointer', background: item.discountType === t ? '#111' : 'transparent', color: item.discountType === t ? '#fff' : '#777' }}
                            >
                              {t === 'percent' ? '%' : 'CHF'}
                            </div>
                          ))}
                        </div>
                        <div
                          onClick={() => {
                            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, discountType: null, discountValue: null } : i)));
                            setExpandedDiscountId(null);
                          }}
                          style={{ fontSize: 11, color: '#999', cursor: 'pointer' }}
                        >
                          Entfernen
                        </div>
                        <div onClick={() => setExpandedDiscountId(null)} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer' }}>
                          Fertig
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && <div style={{ padding: '20px 12px', fontSize: 13, color: '#999' }}>Warenkorb leer — Service oder Artikel hinzufügen.</div>}
          </div>

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
            <button
              className="btn btn-outline"
              disabled={!selectedCustomerId}
              style={{ opacity: selectedCustomerId ? 1 : 0.5, cursor: selectedCustomerId ? 'pointer' : 'not-allowed' }}
              title={selectedCustomerId ? undefined : 'Es muss zuerst ein Kunde ausgewählt werden.'}
              onClick={() => {
                if (!selectedCustomerId) return;
                setShowAnzahlungModal(true);
              }}
            >
              + Anzahlung
            </button>
          </div>

          {!selectedCustomerId && (
            <div style={{ fontSize: 11, color: '#999', marginTop: -14, marginBottom: 20 }}>Für eine Anzahlung muss zuerst ein Kunde ausgewählt werden.</div>
          )}

          {appointmentId && selectedCustomerId && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 14, marginBottom: 20, background: 'var(--color-surface)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Termin-Notiz, Dokumente &amp; Fotos</div>

              <textarea
                value={apptNotes}
                onChange={(e) => setApptNotes(e.target.value)}
                onBlur={handleNotesBlur}
                style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '9px 10px', fontSize: 13, width: '100%', minHeight: 60, fontFamily: 'var(--font-body)', marginBottom: 6 }}
                placeholder="z.B. Beobachtungen, Nachbehandlung, nächste Session…"
              />
              {notesSaving && <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>Speichert…</div>}
              {notesSaved && <div style={{ fontSize: 11, color: '#1a7a3f', marginBottom: 10 }}>✓ Gespeichert.</div>}

              {apptFilesLoading ? (
                <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Lädt…</div>
              ) : !selectedCustomerId ? (
                <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Laufkunde ohne Kundenprofil — Dokumentation nicht erforderlich.</div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: apptDocuments.length > 0 ? '#1a7a3f' : 'var(--color-destructive)',
                      marginBottom: 10,
                    }}
                  >
                    {apptDocuments.length > 0 ? '✓ Alle Dokumente ok' : '⚠ Achtung: es fehlen noch die Gesundheitsdokumente'}
                  </div>

                  {apptPhotos.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 10 }}>
                      {apptPhotos.map((p) => (
                        <div key={p.id} style={{ position: 'relative', cursor: 'pointer' }}>
                          <div
                            onClick={() => openApptLightbox(p)}
                            style={{ aspectRatio: '1', background: 'var(--color-bg)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#999', overflow: 'hidden' }}
                          >
                            {apptPhotoUrls[p.id] ? <img src={apptPhotoUrls[p.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : 'Foto'}
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteApptFile(p);
                            }}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            ✕
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {apptFileError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 10 }}>{apptFileError}</div>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => apptPhotoInputRef.current?.click()} disabled={uploadingApptPhoto}>
                  {uploadingApptPhoto ? 'Lädt hoch…' : 'Foto hinzufügen'}
                </button>
              </div>
              <input
                ref={apptPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  handleApptFileSelected(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </div>

        <div style={{ width: 320, flexShrink: 0, background: '#fff', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
            <div>Total</div>
            <div>{chf(subtotal)}</div>
          </div>

          {applyAnzahlung && (
            <div style={{ border: '1px solid var(--color-accent)', background: 'var(--color-accent-fill)', borderRadius: 6, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: 'var(--color-primary)' }}>
              Anzahlung von {chf(applyAnzahlung.remaining_value)} wird verrechnet — bitte über "Split Payment" kassieren.
            </div>
          )}

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
      {anzahlungPrompt && (
        <Modal title="Anzahlung verrechnen?" onClose={() => setAnzahlungPrompt(null)} width={380}>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            Dieser Kunde hat eine Anzahlung von <strong>{chf(anzahlungPrompt.remaining_value)}</strong>. Jetzt bei diesem Termin verrechnen?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setAnzahlungPrompt(null)}
            >
              Nein, später
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setApplyAnzahlung(anzahlungPrompt);
                setAnzahlungPrompt(null);
              }}
            >
              Ja, verrechnen
            </button>
          </div>
        </Modal>
      )}
      {showVoucherModal && <SellVoucherModal onClose={() => setShowVoucherModal(false)} onAdd={(item) => setItems((prev) => [...prev, item])} />}
      {showAnzahlungModal && selectedCustomerId && (
        <SellAnzahlungModal
          customerId={selectedCustomerId}
          customerName={customers.find((c) => c.id === selectedCustomerId) ? `${customers.find((c) => c.id === selectedCustomerId)!.vorname} ${customers.find((c) => c.id === selectedCustomerId)!.name}` : ''}
          locationId={selectedLocationId || null}
          onClose={() => setShowAnzahlungModal(false)}
          onSold={() => setShowAnzahlungModal(false)}
        />
      )}
      {showCheckout && (
        <CheckoutModal
          subtotal={subtotal}
          initialMethod={paymentMethod}
          customerId={selectedCustomerId || null}
          initialAnzahlung={applyAnzahlung}
          onClose={() => setShowCheckout(false)}
          onComplete={async (payments, total, discountType, discountValue) => {
            await handleCheckoutComplete(payments, total, discountType, discountValue);
          }}
        />
      )}

      {apptLightboxUrl && (
        <div
          onClick={() => setApptLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}
        >
          <img src={apptLightboxUrl} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 6, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} />
          <div onClick={() => setApptLightboxUrl(null)} style={{ position: 'fixed', top: 20, right: 24, color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>
            ✕
          </div>
        </div>
      )}
    </div>
  );
}

const stepperBtnStyle: React.CSSProperties = { width: 20, height: 20, border: '1px solid #ddd', borderRadius: 4, background: 'none', fontSize: 12, lineHeight: '18px', cursor: 'pointer' };
