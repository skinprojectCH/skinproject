import { useState } from 'react';

const PRESET_AMOUNTS = [50, 100, 150, 200];

const card: React.CSSProperties = { width: '100%', maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, overflow: 'hidden', fontFamily: "'Work Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const cardInner: React.CSSProperties = { padding: 28 };
const heading: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 };
const primaryBtn: React.CSSProperties = { background: '#111', color: '#fff', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%' };
const underlineInput: React.CSSProperties = { border: 'none', borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 14, width: '100%', fontFamily: "'Work Sans', sans-serif", background: 'transparent', color: '#333' };
const fieldLabel: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3 };

interface CustomerFormState {
  vorname: string;
  name: string;
  birthdate: string;
  phone: string;
  email: string;
  strasse: string;
  plzOrt: string;
}

const emptyCustomer: CustomerFormState = { vorname: '', name: '', birthdate: '', phone: '', email: '', strasse: '', plzOrt: '' };

export default function GutscheinKaufen() {
  const [mode, setMode] = useState<'gutschein' | 'anzahlung'>('gutschein');
  const [selected, setSelected] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [customer, setCustomer] = useState<CustomerFormState>(emptyCustomer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = selected ?? (parseFloat(customAmount.replace(',', '.')) || 0);
  const amountValid = amount >= 10 && amount <= 2000;

  const customerFieldsValid =
    mode === 'gutschein' ||
    (customer.vorname.trim() && customer.name.trim() && customer.birthdate.trim() && customer.phone.trim() && customer.email.trim() && customer.strasse.trim() && customer.plzOrt.trim());

  const canSubmit = amountValid && (mode === 'gutschein' ? buyerName.trim().length > 0 && buyerEmail.trim().length > 0 : !!customerFieldsValid);

  function updateCustomer(field: keyof CustomerFormState, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCheckout() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const body: any = { purchaseType: mode, amount };
      if (mode === 'gutschein') {
        body.buyerName = buyerName.trim();
        body.buyerEmail = buyerEmail.trim();
      } else {
        body.customer = customer;
      }
      const res = await fetch('/api/create-voucher-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.error || 'Unbekannter Fehler.');
      window.location.href = resBody.url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={card}>
        <div style={cardInner}>
          <img src="/logo-skinproject.png" alt="SkinProject" style={{ width: 64, height: 64, marginBottom: 16 }} />

          <div style={{ display: 'flex', border: '1.5px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            {(['gutschein', 'anzahlung'] as const).map((m) => (
              <div
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === m ? '#111' : 'transparent',
                  color: mode === m ? '#fff' : '#555',
                }}
              >
                {m === 'gutschein' ? 'Gutschein kaufen' : 'Anzahlung tätigen'}
              </div>
            ))}
          </div>

          <div style={heading}>{mode === 'gutschein' ? 'Gutschein kaufen' : 'Anzahlung tätigen'}</div>
          <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
            {mode === 'gutschein'
              ? 'Einlösbar an jedem SkinProject-Standort. Nach der Zahlung kannst du deinen Gutschein direkt herunterladen.'
              : 'Wird als Guthaben deinem Kundenprofil gutgeschrieben und kann bei deinem nächsten Termin als Zahlungsart verwendet werden.'}
          </div>

          <div style={{ ...fieldLabel, marginBottom: 8 }}>Betrag wählen</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {PRESET_AMOUNTS.map((a) => (
              <div
                key={a}
                onClick={() => {
                  setSelected(a);
                  setCustomAmount('');
                }}
                style={{
                  border: `1.5px solid ${selected === a ? '#111' : '#ddd'}`,
                  background: selected === a ? '#111' : 'transparent',
                  color: selected === a ? '#fff' : '#333',
                  borderRadius: 8,
                  padding: '14px 0',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                CHF {a}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={fieldLabel}>Anderer Betrag (CHF 10–2000)</div>
            <input
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value.replace(/[^\d.,]/g, ''));
                setSelected(null);
              }}
              placeholder="z.B. 80"
              inputMode="decimal"
              style={{ ...underlineInput, borderColor: selected === null && customAmount ? '#111' : '#ccc' }}
            />
          </div>

          {mode === 'gutschein' ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={fieldLabel}>Dein Name</div>
                <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={underlineInput} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={fieldLabel}>E-Mail (für Beleg)</div>
                <input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} type="email" style={underlineInput} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
                Damit dir das Guthaben zugewiesen werden kann, brauchen wir folgende Angaben:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={fieldLabel}>Vorname</div>
                  <input value={customer.vorname} onChange={(e) => updateCustomer('vorname', e.target.value)} style={underlineInput} />
                </div>
                <div>
                  <div style={fieldLabel}>Name</div>
                  <input value={customer.name} onChange={(e) => updateCustomer('name', e.target.value)} style={underlineInput} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={fieldLabel}>Geburtsdatum</div>
                <input value={customer.birthdate} onChange={(e) => updateCustomer('birthdate', e.target.value)} type="date" style={underlineInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={fieldLabel}>Mobile</div>
                <input value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} type="tel" placeholder="079 123 45 67" style={underlineInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={fieldLabel}>E-Mail</div>
                <input value={customer.email} onChange={(e) => updateCustomer('email', e.target.value)} type="email" style={underlineInput} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={fieldLabel}>Strasse</div>
                <input value={customer.strasse} onChange={(e) => updateCustomer('strasse', e.target.value)} style={underlineInput} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={fieldLabel}>PLZ / Ort</div>
                <input value={customer.plzOrt} onChange={(e) => updateCustomer('plzOrt', e.target.value)} placeholder="8000 Zürich" style={underlineInput} />
              </div>
            </>
          )}

          {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 14 }}>{error}</div>}

          <button style={{ ...primaryBtn, opacity: canSubmit && !loading ? 1 : 0.4 }} disabled={!canSubmit || loading} onClick={handleCheckout}>
            {loading ? 'Weiterleitung…' : `Weiter zur Zahlung — CHF ${amount ? amount.toFixed(2) : '0.00'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
