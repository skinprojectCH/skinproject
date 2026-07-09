import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === 'true';

export default function RequireAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (AUTH_DISABLED) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (AUTH_DISABLED) return <Outlet />;

  if (session === undefined) return <div style={{ padding: 40, fontSize: 13, color: '#999' }}>Lädt…</div>;
  if (session === null) return <Navigate to="/login" replace />;

  return <Outlet />;
}
