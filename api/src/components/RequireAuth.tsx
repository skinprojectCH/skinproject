import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === 'true';
const DEV_EMAIL = import.meta.env.VITE_DEV_LOGIN_EMAIL as string | undefined;
const DEV_PASSWORD = import.meta.env.VITE_DEV_LOGIN_PASSWORD as string | undefined;

export default function RequireAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [devError, setDevError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        setSession(data.session);
        return;
      }

      // Kein Login-Formular gewünscht, aber wir brauchen trotzdem eine echte
      // Supabase-Session, sonst blockt RLS jeden Zugriff (anon-Rolle).
      if (AUTH_DISABLED && DEV_EMAIL && DEV_PASSWORD) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: DEV_EMAIL, password: DEV_PASSWORD });
        if (!active) return;
        if (error) {
          setDevError(error.message);
          setSession(null);
        } else {
          setSession(signInData.session);
        }
        return;
      }

      setSession(null);
    }

    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSession(session);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) return <div style={{ padding: 40, fontSize: 13, color: '#999' }}>Lädt…</div>;

  if (session === null) {
    if (AUTH_DISABLED && devError) {
      return (
        <div style={{ padding: 40, fontSize: 13, color: 'var(--color-destructive)' }}>
          Auto-Login (VITE_DEV_LOGIN_EMAIL/PASSWORD) fehlgeschlagen: {devError}
        </div>
      );
    }
    if (AUTH_DISABLED) {
      return (
        <div style={{ padding: 40, fontSize: 13, color: 'var(--color-destructive)' }}>
          VITE_DISABLE_AUTH ist aktiv, aber VITE_DEV_LOGIN_EMAIL / VITE_DEV_LOGIN_PASSWORD fehlen — ohne echte Session
          blockt die Datenbank (RLS) alle Anfragen.
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
