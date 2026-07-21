import { useState } from 'react';

const PRESET_AMOUNTS = [50, 100, 150, 200];

const card: React.CSSProperties = { width: '100%', maxWidth: 420, margin: '0 auto', background: '#fff', borderRadius: 20, overflow: 'hidden', fontFamily: "'Work Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const cardInner: React.CSSProperties = { padding: 28 };
const heading: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 };
const primaryBtn: React.CSSProperties = { background: '#111', color: '#fff', textAlign: 'center', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%' };
const underlineInput: React.CSSProperties = { border: 'none', borderBottom: '1.5px solid #ccc', padding: '8px 2px', fontSize: 14, width: '100%', fontFamily: "'Work Sans', sans-serif", background: 'transparent', color: '#333' };
const fieldLabel: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3 };

export default function GutscheinKaufen() {
  const [selected, setSelected] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = selected ?? (parseFloat(customAmount.replace(',', '.')) || 0);
  const canSubmit = amount >= 10 && amount <= 2000;

  async function handleCheckout() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-voucher-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, buyerName: buyerName.trim() || null, buyerEmail: buyerEmail.trim() || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');
      window.location.href = body.url;
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
          <div style={heading}>Gutschein kaufen</div>
          <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
            Einlösbar an jedem SkinProject-Standort. Nach der Zahlung kannst du deinen Gutschein direkt herunterladen.
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

          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>Dein Name (optional)</div>
            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={underlineInput} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={fieldLabel}>E-Mail (optional, für Beleg)</div>
            <input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} type="email" style={underlineInput} />
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 14 }}>{error}</div>}

          <button style={{ ...primaryBtn, opacity: canSubmit && !loading ? 1 : 0.4 }} disabled={!canSubmit || loading} onClick={handleCheckout}>
            {loading ? 'Weiterleitung…' : `Weiter zur Zahlung — CHF ${amount ? amount.toFixed(2) : '0.00'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
