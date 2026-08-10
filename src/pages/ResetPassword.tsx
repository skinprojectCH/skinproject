import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

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

// Wird über den Passwort-Reset-Link erreicht (Supabase setzt beim Klick automatisch
// eine "recovery"-Session -- siehe RequireAuth.tsx, das bei PASSWORD_RECOVERY hierher
// umleitet). Zeigt ein Formular für ein neues Passwort statt den Nutzer einfach
// direkt in die App einzuloggen.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/kalender');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          padding: 40,
          width: 360,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Neues Passwort</h1>

        {hasSession === false && (
          <p style={{ fontSize: 13, color: 'var(--color-destructive)', marginBottom: 16 }}>
            Dieser Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Reset-Link an.
          </p>
        )}

        {hasSession && (
          <form onSubmit={handleSubmit}>
            <label className="label-uppercase" htmlFor="password">
              Neues Passwort
            </label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} autoFocus />

            <label className="label-uppercase" htmlFor="confirm">
              Passwort bestätigen
            </label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={inputStyle} />

            {error && <p style={{ color: 'var(--color-destructive)', fontSize: 12, marginTop: 4 }}>{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
              {loading ? 'Speichert…' : 'Passwort speichern'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
