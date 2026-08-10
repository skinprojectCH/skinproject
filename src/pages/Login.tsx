import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface StaffListEntry {
  id: string;
  role: 'admin' | 'manager' | 'employee';
  vorname: string;
  name: string;
  locationId: string | null;
  pinConfigured: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Salon Manager',
  employee: 'Angestellte/r',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '9px 12px',
  margin: '6px 0 16px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-control-desktop)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 'var(--radius-card)',
  padding: 40,
  width: 360,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

// Ziffernpad für die PIN-Eingabe (4-6 Stellen, keine Tastatur nötig -- schneller auf
// Touch-Geräten an der Kasse).
function PinPad({ value, onChange, onSubmit, maxLength = 6 }: { value: string; onChange: (v: string) => void; onSubmit: () => void; maxLength?: number }) {
  function press(digit: string) {
    if (value.length < maxLength) onChange(value + digit);
  }
  function backspace() {
    onChange(value.slice(0, -1));
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '1.5px solid var(--color-accent)',
              background: i < value.length ? 'var(--color-accent)' : 'transparent',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            style={{ padding: '14px 0', fontSize: 18, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            {d}
          </button>
        ))}
        <button type="button" onClick={backspace} style={{ padding: '14px 0', fontSize: 14, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', color: '#777' }}>
          ⌫
        </button>
        <button
          type="button"
          onClick={() => press('0')}
          style={{ padding: '14px 0', fontSize: 18, borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
        >
          0
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={value.length < 4}
          style={{ padding: '14px 0', fontSize: 14, borderRadius: 8, border: 'none', background: 'var(--color-accent)', color: '#fff', cursor: value.length >= 4 ? 'pointer' : 'default', opacity: value.length >= 4 ? 1 : 0.5 }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffListEntry[] | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StaffListEntry | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  useEffect(() => {
    fetch('/api/staff-list')
      .then((r) => r.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setStaff(body.staff || []);
      })
      .catch((e) => setStaffError(e.message));
  }, []);

  async function submitPin(finalPin: string) {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff-pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selected.role, staffId: selected.id, pin: finalPin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Login fehlgeschlagen.');
      const { error: sessionError } = await supabase.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
      if (sessionError) throw sessionError;
      navigate('/kalender');
    } catch (e: any) {
      setError(e.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  // Alter E-Mail/Passwort-Login bleibt als Notfall-Zugang bestehen, falls für einen
  // Account noch kein PIN eingerichtet ist.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('E-Mail oder Passwort ist falsch.');
      return;
    }
    navigate('/kalender');
  }

  if (showPasswordFallback) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <form onSubmit={handlePasswordSubmit} style={cardStyle}>
          <h1 style={{ fontSize: 24, marginBottom: 24 }}>SkinProject</h1>
          <label className="label-uppercase" htmlFor="email">
            E-Mail
          </label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          <label className="label-uppercase" htmlFor="password">
            Passwort
          </label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          {error && <p style={{ color: 'var(--color-destructive)', fontSize: 12, marginTop: 4 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
          <div
            onClick={() => {
              setShowPasswordFallback(false);
              setError(null);
            }}
            style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer' }}
          >
            ← Zurück zum PIN-Login
          </div>
        </form>
      </div>
    );
  }

  if (selected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={cardStyle}>
          <div
            onClick={() => {
              setSelected(null);
              setPin('');
              setError(null);
            }}
            style={{ fontSize: 12, color: '#999', cursor: 'pointer', marginBottom: 14 }}
          >
            ← Zurück
          </div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>
            {selected.vorname} {selected.name}
          </h1>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 24 }}>{ROLE_LABELS[selected.role]} · PIN eingeben</p>
          {error && <p style={{ color: 'var(--color-destructive)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</p>}
          <PinPad value={pin} onChange={setPin} onSubmit={() => submitPin(pin)} />
          {loading && <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 14 }}>Wird geprüft…</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ ...cardStyle, width: 400 }}>
        <h1 style={{ fontSize: 24, marginBottom: 24, textAlign: 'center' }}>SkinProject</h1>
        <p className="label-uppercase" style={{ marginBottom: 12, textAlign: 'center' }}>
          Wer bist du?
        </p>
        {staffError && <p style={{ color: 'var(--color-destructive)', fontSize: 12, marginBottom: 12 }}>{staffError}</p>}
        {!staff && !staffError && <p style={{ fontSize: 13, color: '#999', textAlign: 'center' }}>Lädt…</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
          {staff?.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid #eee',
                background: '#fff',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {s.vorname} {s.name}
              </span>
              <span style={{ fontSize: 11, color: '#999' }}>{ROLE_LABELS[s.role]}</span>
            </button>
          ))}
        </div>
        <div
          onClick={() => setShowPasswordFallback(true)}
          style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 12, color: '#999', cursor: 'pointer' }}
        >
          Mit E-Mail &amp; Passwort anmelden
        </div>
      </div>
    </div>
  );
}
