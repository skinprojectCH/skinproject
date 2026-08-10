import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-card)',
          padding: 40,
          width: 360,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>SkinProject</h1>

        <label className="label-uppercase" htmlFor="email">
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <label className="label-uppercase" htmlFor="password">
          Passwort
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ color: 'var(--color-destructive)', fontSize: 12, marginTop: 4 }}>{error}</p>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>

        <a
          href="#"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12,
            color: 'var(--color-accent)',
          }}
        >
          Passwort vergessen?
        </a>
      </form>
    </div>
  );
}

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
