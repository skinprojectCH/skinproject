import { useState } from 'react';

const PRESET_AMOUNTS = [50, 100, 150, 200];

// Verkaufsfenster Halloween-Special (muss mit api/create-voucher-checkout.ts übereinstimmen) --
// hier nur fürs Ein-/Ausblenden der Promo-Karte, die eigentliche Durchsetzung passiert serverseitig.
const HALLOWEEN_DEAL_CUTOFF = new Date('2026-11-01T23:59:00+01:00');
const HALLOWEEN_DEAL_PRICE = 31;

const halloweenCard: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  margin: '0 auto 20px',
  background: 'radial-gradient(circle at 50% 0%, #2b2220 0%, #141010 70%)',
  borderRadius: 20,
  overflow: 'hidden',
  fontFamily: "'Work Sans', sans-serif",
  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  border: '1px solid #3a2e28',
  color: '#f1e9e0',
};

function HalloweenDealCard() {
  const [open, setOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (new Date() > HALLOWEEN_DEAL_CUTOFF) return null;

  async function handleBuy() {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setError('Bitte Name und E-Mail angeben.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-voucher-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseType: 'halloween', buyerName: buyerName.trim(), buyerEmail: buyerEmail.trim() }),
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
    <div style={halloweenCard}>
      <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#f1e9e0',
            marginBottom: 2,
          }}
        >
          Halloween
        </div>
        <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: '#cbb89a', marginBottom: 18 }}>Special</div>

        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: '#ff9a3c', marginBottom: 4 }}>HALLOWEEN PIERCING SPECIAL</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700, color: '#ff8c1a', textShadow: '0 0 18px rgba(255,140,26,0.45)', marginBottom: 6 }}>
          NUR CHF {HALLOWEEN_DEAL_PRICE}.–
        </div>
        <div style={{ fontSize: 12, color: '#cbb89a', marginBottom: 14, lineHeight: 1.5 }}>
          Teuflisch guter Style. Höllisch kleiner Preis.
          <br />
          Schnapp Dir Dein Wunschpiercing inklusive Titanschmuck!
          <br />
          Jetzt sichern, jederzeit einlösen.
        </div>

        {!open ? (
          <button
            onClick={() => setOpen(true)}
            style={{
              background: '#ff8c1a',
              color: '#1a1510',
              textAlign: 'center',
              padding: 14,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            HOL DIR DEIN TICKET!
          </button>
        ) : (
          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#cbb89a', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3 }}>Dein Name</div>
              <input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                style={{ border: 'none', borderBottom: '1.5px solid #5a4a3f', padding: '8px 2px', fontSize: 14, width: '100%', background: 'transparent', color: '#f1e9e0' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#cbb89a', marginBottom: 4, fontWeight: 600, letterSpacing: 0.3 }}>E-Mail (für Ticket)</div>
              <input
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                type="email"
                style={{ border: 'none', borderBottom: '1.5px solid #5a4a3f', padding: '8px 2px', fontSize: 14, width: '100%', background: 'transparent', color: '#f1e9e0' }}
              />
            </div>
            {error && <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 12 }}>{error}</div>}
            <button
              onClick={handleBuy}
              disabled={loading}
              style={{
                background: '#ff8c1a',
                color: '#1a1510',
                textAlign: 'center',
                padding: 14,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Weiterleitung…' : `JETZT SICHERN — CHF ${HALLOWEEN_DEAL_PRICE}.00`}
            </button>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#9a8a7a', marginTop: 16, lineHeight: 1.5 }}>
          SkinProject Zürich Oerlikon &amp; Wädenswil
          <br />
          Ausgenommen Intim- und Wohlfühl-Piercings. Es gelten unsere Altersregelungen.
        </div>

        <img src="/logo-skinproject.png" alt="SkinProject" style={{ width: 40, height: 40, marginTop: 18, opacity: 0.85 }} />
      </div>
    </div>
  );
}

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

  // Anzahlung: erst Telefonnummer prüfen, dann ggf. vorausgefülltes Formular zeigen.
  const [anzahlungStep, setAnzahlungStep] = useState<'phone' | 'form'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [foundExisting, setFoundExisting] = useState(false);
  const [customer, setCustomer] = useState<CustomerFormState>(emptyCustomer);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = selected ?? (parseFloat(customAmount.replace(',', '.')) || 0);
  const amountValid = amount >= 10 && amount <= 2000;

  const customerFieldsValid =
    customer.vorname.trim() && customer.name.trim() && customer.birthdate.trim() && customer.phone.trim() && customer.email.trim() && customer.strasse.trim() && customer.plzOrt.trim();

  const canSubmit =
    amountValid && (mode === 'gutschein' ? buyerName.trim().length > 0 && buyerEmail.trim().length > 0 : anzahlungStep === 'form' && !!customerFieldsValid);

  function updateCustomer(field: keyof CustomerFormState, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function switchMode(m: 'gutschein' | 'anzahlung') {
    setMode(m);
    setError(null);
    if (m === 'anzahlung') {
      setAnzahlungStep('phone');
      setPhoneInput('');
      setPhoneError(null);
      setFoundExisting(false);
      setCustomer(emptyCustomer);
    }
  }

  async function handlePhoneCheck() {
    if (!phoneInput.trim()) {
      setPhoneError('Bitte Telefonnummer eingeben.');
      return;
    }
    setPhoneChecking(true);
    setPhoneError(null);
    try {
      const res = await fetch('/api/registration-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Unbekannter Fehler.');

      // Gleiches Telefon-Format wie überall in der App -- die normalisierte Nummer vom
      // Server übernehmen, nicht die rohe Eingabe.
      if (body.found && body.customer) {
        setFoundExisting(true);
        setCustomer({
          vorname: body.customer.vorname || '',
          name: body.customer.name || '',
          birthdate: body.customer.birthdate || '',
          phone: body.customer.phone || '',
          email: body.customer.email || '',
          strasse: body.customer.strasse || '',
          plzOrt: body.customer.plz_ort || '',
        });
      } else {
        setFoundExisting(false);
        setCustomer({ ...emptyCustomer, phone: body.normalizedPhone || phoneInput });
      }
      setAnzahlungStep('form');
    } catch (e: any) {
      setPhoneError(e.message);
    } finally {
      setPhoneChecking(false);
    }
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
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <HalloweenDealCard />
      <div style={card}>
        <div style={cardInner}>
          <img src="/logo-skinproject.png" alt="SkinProject" style={{ width: 64, height: 64, marginBottom: 16 }} />

          <div style={{ display: 'flex', border: '1.5px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            {(['gutschein', 'anzahlung'] as const).map((m) => (
              <div
                key={m}
                onClick={() => switchMode(m)}
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

          {/* ANZAHLUNG SCHRITT 1: Telefonnummer prüfen */}
          {mode === 'anzahlung' && anzahlungStep === 'phone' && (
            <>
              <div style={heading}>Anzahlung tätigen</div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
                Zuerst deine Telefonnummer — falls du schon bei uns registriert bist, füllen wir den Rest automatisch für dich aus.
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={fieldLabel}>Mobile</div>
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  type="tel"
                  placeholder="079 123 45 67"
                  style={underlineInput}
                  autoFocus
                />
              </div>
              {phoneError && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 14 }}>{phoneError}</div>}
              <button style={{ ...primaryBtn, opacity: phoneChecking ? 0.6 : 1 }} disabled={phoneChecking} onClick={handlePhoneCheck}>
                {phoneChecking ? 'Prüft…' : 'Weiter'}
              </button>
            </>
          )}

          {/* ANZAHLUNG SCHRITT 2 + GUTSCHEIN: Betrag + restliche Angaben */}
          {(mode === 'gutschein' || anzahlungStep === 'form') && (
            <>
              <div style={heading}>{mode === 'gutschein' ? 'Gutschein kaufen' : 'Anzahlung tätigen'}</div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 24 }}>
                {mode === 'gutschein'
                  ? 'Einlösbar an jedem SkinProject-Standort. Nach der Zahlung kannst du deinen Gutschein direkt herunterladen.'
                  : foundExisting
                    ? 'Schön, dich wiederzusehen! Wir haben deine Daten schon — du kannst sie unten bei Bedarf anpassen.'
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
                    <input value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} type="tel" style={underlineInput} />
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
                  <div onClick={() => setAnzahlungStep('phone')} style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}>
                    ← Andere Telefonnummer verwenden
                  </div>
                </>
              )}

              {error && <div style={{ fontSize: 12, color: 'var(--color-destructive)', marginBottom: 14 }}>{error}</div>}

              <button style={{ ...primaryBtn, opacity: canSubmit && !loading ? 1 : 0.4 }} disabled={!canSubmit || loading} onClick={handleCheckout}>
                {loading ? 'Weiterleitung…' : `Weiter zur Zahlung — CHF ${amount ? amount.toFixed(2) : '0.00'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
